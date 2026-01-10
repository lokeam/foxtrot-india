import { PrismaClient, EquipmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  await prisma.inspection.deleteMany();
  await prisma.equipment.deleteMany();

  const equipment = await prisma.equipment.createMany({
    data: [
      {
        serialNumber: 'CAT-336-2019',
        make: 'Caterpillar',
        model: '336 Excavator',
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 2847,
        projectSite: 'Tampa Convention Center - Site B',
        latitude: 27.9506,
        longitude: -82.4572,
      },
      {
        serialNumber: 'CAT-D8T-2020',
        make: 'Caterpillar',
        model: 'D8T Dozer',
        status: EquipmentStatus.NEEDS_SERVICE,
        engineHours: 4523,
        projectSite: 'Tampa Convention Center - Site B',
        latitude: 27.9512,
        longitude: -82.4568,
      },
      {
        serialNumber: 'JD-850K-2021',
        make: 'John Deere',
        model: '850K Crawler Dozer',
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 3156,
        projectSite: 'Tampa Convention Center - Site B',
        latitude: 27.9498,
        longitude: -82.4580,
      },
      {
        serialNumber: 'KOM-PC490-2018',
        make: 'Komatsu',
        model: 'PC490LC Excavator',
        status: EquipmentStatus.NEEDS_SERVICE,
        engineHours: 5892,
        projectSite: 'Tampa Convention Center - Site B',
        latitude: 27.9515,
        longitude: -82.4565,
      },
      {
        serialNumber: 'VOL-EC380-2022',
        make: 'Volvo',
        model: 'EC380E Excavator',
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 1234,
        projectSite: 'Tampa Convention Center - Site B',
        latitude: 27.9502,
        longitude: -82.4575,
      },
    ],
  });

  console.log(`✅ Created ${equipment.count} equipment records`);

  const allEquipment = await prisma.equipment.findMany();

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  const inspections = await prisma.inspection.createMany({
    data: [
      {
        equipmentId: allEquipment[0].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 2847,
        notes: 'All systems operational. Hydraulics running smoothly.',
        photoUrls: [],
        inspectorName: 'Jake Morrison',
        latitude: 27.9506,
        longitude: -82.4572,
        timestamp: threeDaysAgo,
      },
      {
        equipmentId: allEquipment[0].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 2720,
        notes: 'Regular maintenance completed. Engine oil changed.',
        photoUrls: [],
        inspectorName: 'Mike Chen',
        latitude: 27.9506,
        longitude: -82.4572,
        timestamp: oneWeekAgo,
      },
      {
        equipmentId: allEquipment[0].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 2580,
        notes: null,
        photoUrls: [],
        inspectorName: 'Sarah Williams',
        latitude: 27.9506,
        longitude: -82.4572,
        timestamp: twoWeeksAgo,
      },
      {
        equipmentId: allEquipment[1].id,
        status: EquipmentStatus.NEEDS_SERVICE,
        engineHours: 4523,
        notes: 'Hydraulic leak detected on left arm. Needs immediate attention.',
        photoUrls: [],
        inspectorName: 'Jake Morrison',
        latitude: 27.9512,
        longitude: -82.4568,
        timestamp: threeDaysAgo,
      },
      {
        equipmentId: allEquipment[1].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 4380,
        notes: 'Running well after recent service.',
        photoUrls: [],
        inspectorName: 'Sarah Williams',
        latitude: 27.9512,
        longitude: -82.4568,
        timestamp: oneWeekAgo,
      },
      {
        equipmentId: allEquipment[1].id,
        status: EquipmentStatus.NEEDS_SERVICE,
        engineHours: 4250,
        notes: 'Track tension needs adjustment. Scheduled for service.',
        photoUrls: [],
        inspectorName: 'Mike Chen',
        latitude: 27.9512,
        longitude: -82.4568,
        timestamp: twoWeeksAgo,
      },
      {
        equipmentId: allEquipment[2].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 3156,
        notes: 'Excellent condition. No issues found.',
        photoUrls: [],
        inspectorName: 'Mike Chen',
        latitude: 27.9498,
        longitude: -82.4580,
        timestamp: threeDaysAgo,
      },
      {
        equipmentId: allEquipment[2].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 3050,
        notes: 'Routine inspection completed.',
        photoUrls: [],
        inspectorName: 'Jake Morrison',
        latitude: 27.9498,
        longitude: -82.4580,
        timestamp: oneWeekAgo,
      },
      {
        equipmentId: allEquipment[2].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 2920,
        notes: null,
        photoUrls: [],
        inspectorName: 'Sarah Williams',
        latitude: 27.9498,
        longitude: -82.4580,
        timestamp: threeWeeksAgo,
      },
      {
        equipmentId: allEquipment[3].id,
        status: EquipmentStatus.NEEDS_SERVICE,
        engineHours: 5892,
        notes: 'Engine making unusual noise. Recommend diagnostic check.',
        photoUrls: [],
        inspectorName: 'Sarah Williams',
        latitude: 27.9515,
        longitude: -82.4565,
        timestamp: threeDaysAgo,
      },
      {
        equipmentId: allEquipment[3].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 5750,
        notes: 'Post-service inspection. All systems green.',
        photoUrls: [],
        inspectorName: 'Mike Chen',
        latitude: 27.9515,
        longitude: -82.4565,
        timestamp: twoWeeksAgo,
      },
      {
        equipmentId: allEquipment[3].id,
        status: EquipmentStatus.NEEDS_SERVICE,
        engineHours: 5620,
        notes: 'Air filter replacement needed.',
        photoUrls: [],
        inspectorName: 'Jake Morrison',
        latitude: 27.9515,
        longitude: -82.4565,
        timestamp: threeWeeksAgo,
      },
      {
        equipmentId: allEquipment[4].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 1234,
        notes: 'New equipment performing excellently.',
        photoUrls: [],
        inspectorName: 'Jake Morrison',
        latitude: 27.9502,
        longitude: -82.4575,
        timestamp: threeDaysAgo,
      },
      {
        equipmentId: allEquipment[4].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 1150,
        notes: 'Break-in period complete. No issues.',
        photoUrls: [],
        inspectorName: 'Sarah Williams',
        latitude: 27.9502,
        longitude: -82.4575,
        timestamp: oneWeekAgo,
      },
      {
        equipmentId: allEquipment[4].id,
        status: EquipmentStatus.OPERATIONAL,
        engineHours: 1050,
        notes: null,
        photoUrls: [],
        inspectorName: 'Mike Chen',
        latitude: 27.9502,
        longitude: -82.4575,
        timestamp: twoWeeksAgo,
      },
    ],
  });

  console.log(`✅ Created ${inspections.count} inspection records`);

  for (const eq of allEquipment) {
    const latestInspection = await prisma.inspection.findFirst({
      where: { equipmentId: eq.id },
      orderBy: { timestamp: 'desc' },
    });

    if (latestInspection) {
      await prisma.equipment.update({
        where: { id: eq.id },
        data: {
          lastInspectionAt: latestInspection.timestamp,
          status: latestInspection.status,
          engineHours: latestInspection.engineHours,
        },
      });
    }
  }

  console.log('✅ Updated equipment with latest inspection data');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
