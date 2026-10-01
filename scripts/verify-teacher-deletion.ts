import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { requireLocalDatabase } from './local-env'

const db = new PrismaClient()
const base = 'http://localhost:3002'
async function main() {
 requireLocalDatabase()
 const accounts = readdirSync('.local').filter(f => f.startsWith('accounts-')).flatMap(f => JSON.parse(readFileSync(`.local/${f}`, 'utf8')))
 const prefix = `DELETE-TEACHER-TEST-${Date.now()}`
 const name = `${prefix}-unused`
 const assigned = `${prefix}-assigned`
 const replacementName = `${prefix}-replacement`
 const cookies: string[] = []
 const remove = (teacher: string, cookie?: string, origin = base) => fetch(`${base}/api/teachers?name=${encodeURIComponent(teacher)}`, {method:'DELETE', headers: {Origin:origin, ...(cookie ? {Cookie:cookie} : {})}})
 try {
  await db.teacher.createMany({data:[assigned,replacementName].map(name => ({name}))})
  await db.schedule.create({data:{course:1,group:'TEST',groupFull:prefix,specialty:'TEST',dayOfWeek:'Понедельник',timeSlot:'1',subject:'TEST',teacher:`Другой преподаватель, ${assigned}`,campus:'SECONDARY'}})
  await db.replacement.create({data:{date:'2099-01-01',course:1,groupFull:prefix,pairNumber:1,newSubject:'TEST',newTeacher:replacementName,campus:'MAIN'}})
  assert.equal((await remove(assigned)).status,401)
  for (const username of ['dispatcher1','dispatcher2','admin']) {
   const account = accounts.find(a => a.username === username)
   const login = await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({username,password:account.password})})
   assert.equal(login.status,200)
   const cookie=login.headers.get('set-cookie')!.split(';')[0];cookies.push(cookie)
   await db.teacher.create({data:{name}})
   assert.equal((await remove(name,cookie,'https://example.invalid')).status,403)
   assert.equal((await remove('',cookie)).status,400)
   assert.equal((await remove(assigned,cookie)).status,409)
   assert.equal((await remove(replacementName,cookie)).status,409)
   assert.equal((await remove(name,cookie)).status,200)
   assert.equal(await db.teacher.findUnique({where:{name}}),null)
   assert.equal((await remove(name,cookie)).status,404)
   const logs=await db.auditLog.findMany({where:{username,entity:'teacher',action:'DELETE'}})
   assert.ok(logs.some(log => JSON.stringify(log.details).includes(name)))
   const listed=await fetch(base+'/api/teachers').then(r=>r.json())
   assert.ok(!listed.teachers.includes(name))
   console.log(`${username}: deletion, linked lessons/replacements protection, audit, CSRF PASS`)
  }
  assert.equal(await db.schedule.count({where:{groupFull:prefix}}),1)
  assert.equal(await db.replacement.count({where:{groupFull:prefix}}),1)
 } finally {
  for(const cookie of cookies) await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:base,Cookie:cookie}})
  await db.schedule.deleteMany({where:{groupFull:prefix}})
  await db.replacement.deleteMany({where:{groupFull:prefix}})
  await db.teacher.deleteMany({where:{name:{startsWith:prefix}}})
  await db.$disconnect()
 }
}
main().catch(error=>{console.error(error);process.exitCode=1})
