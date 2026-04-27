const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Checking database ===')
  
  // Проверяем общее количество записей
  const total = await prisma.schedule.count()
  console.log('Total schedule records:', total)
  
  // Проверяем записи по курсам
  for (let course = 1; course <= 4; course++) {
    const count = await prisma.schedule.count({ where: { course } })
    console.log(`Course ${course}:`, count, 'records')
  }
  
  // Проверяем записи по площадкам
  const mainCount = await prisma.schedule.count({ where: { campus: 'MAIN' } })
  const secondaryCount = await prisma.schedule.count({ where: { campus: 'SECONDARY' } })
  console.log('MAIN campus:', mainCount, 'records')
  console.log('SECONDARY campus:', secondaryCount, 'records')
  
  // Показываем примеры записей
  const samples = await prisma.schedule.findMany({
    take: 5,
    select: {
      id: true,
      course: true,
      group: true,
      groupFull: true,
      campus: true,
      subject: true,
    }
  })
  console.log('\nSample records:')
  console.log(JSON.stringify(samples, null, 2))
  
  // Проверяем уникальные группы
  const groups = await prisma.schedule.findMany({
    distinct: ['groupFull'],
    select: { groupFull: true, course: true, campus: true },
    orderBy: { course: 'asc' }
  })
  console.log('\nUnique groups:')
  groups.forEach(g => console.log(`  ${g.course} курс: ${g.groupFull} (${g.campus})`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
