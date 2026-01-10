import { PrismaClient, EquipmentStatus, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  await prisma.serviceRecord.deleteMany();
  await prisma.job.deleteMany();
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

  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

  const jobs = await prisma.job.createMany({
    data: [
      {
        equipmentId: allEquipment[0].id,
        customerId: 'cust_001',
        customerName: 'Tampa Convention Center',
        siteAddress: '333 S Franklin St, Tampa, FL 33602',
        contactName: 'Michael Rodriguez',
        contactPhone: '(813) 274-8511',
        contactEmail: 'facilities@tampacc.com',
        issueDescription: 'Excessive track wear and rust on undercarriage. Track links showing signs of deterioration and potential failure.',
        status: JobStatus.ASSIGNED,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: now,
      },
      {
        equipmentId: allEquipment[1].id,
        customerId: 'cust_001',
        customerName: 'Tampa Convention Center',
        siteAddress: '333 S Franklin St, Tampa, FL 33602',
        contactName: 'Michael Rodriguez',
        contactPhone: '(813) 274-8511',
        contactEmail: 'facilities@tampacc.com',
        issueDescription: 'Hydraulic leak detected on left arm. Requires immediate repair.',
        status: JobStatus.ASSIGNED,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: oneDayAgo,
      },
      {
        equipmentId: allEquipment[2].id,
        customerId: 'cust_001',
        customerName: 'Tampa Convention Center',
        siteAddress: '333 S Franklin St, Tampa, FL 33602',
        contactName: 'Michael Rodriguez',
        contactPhone: '(813) 274-8511',
        contactEmail: 'facilities@tampacc.com',
        issueDescription: 'Scheduled 500-hour maintenance service.',
        status: JobStatus.IN_PROGRESS,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: twoDaysAgo,
      },
      {
        equipmentId: allEquipment[3].id,
        customerId: 'cust_001',
        customerName: 'Tampa Convention Center',
        siteAddress: '333 S Franklin St, Tampa, FL 33602',
        contactName: 'Michael Rodriguez',
        contactPhone: '(813) 274-8511',
        contactEmail: 'facilities@tampacc.com',
        issueDescription: 'Engine making unusual knocking noise. Diagnostic required.',
        status: JobStatus.COMPLETED,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: fiveDaysAgo,
      },
      {
        equipmentId: allEquipment[4].id,
        customerId: 'cust_001',
        customerName: 'Tampa Convention Center',
        siteAddress: '333 S Franklin St, Tampa, FL 33602',
        contactName: 'Michael Rodriguez',
        contactPhone: '(813) 274-8511',
        contactEmail: 'facilities@tampacc.com',
        issueDescription: 'Track tension adjustment needed.',
        status: JobStatus.COMPLETED,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: oneWeekAgo,
      },
      {
        equipmentId: allEquipment[0].id,
        customerId: 'cust_002',
        customerName: 'Sunshine State Construction',
        siteAddress: '1250 Tech Blvd, Tampa, FL 33619',
        contactName: 'Maria Garcia',
        contactPhone: '(813) 555-0456',
        contactEmail: 'm.garcia@suncoastconst.com',
        issueDescription: 'Air filter replacement and general inspection.',
        status: JobStatus.COMPLETED,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: twoWeeksAgo,
      },
      {
        equipmentId: allEquipment[1].id,
        customerId: 'cust_001',
        customerName: 'Tampa Convention Center',
        siteAddress: '333 S Franklin St, Tampa, FL 33602',
        contactName: 'Michael Rodriguez',
        contactPhone: '(813) 274-8511',
        contactEmail: 'facilities@tampacc.com',
        issueDescription: 'Coolant leak from radiator. Needs seal replacement.',
        status: JobStatus.COMPLETED,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: threeWeeksAgo,
      },
      {
        equipmentId: allEquipment[2].id,
        customerId: 'cust_003',
        customerName: 'Gulf Coast Excavation',
        siteAddress: '8901 Causeway Blvd, Tampa, FL 33619',
        contactName: 'David Chen',
        contactPhone: '(813) 555-0789',
        contactEmail: 'operations@gulfcoastexc.com',
        issueDescription: 'Electrical system fault - dashboard warning lights.',
        status: JobStatus.COMPLETED,
        technicianId: 'tech_001',
        technicianName: 'Jake Morrison',
        assignedAt: threeWeeksAgo,
      },
      {
        equipmentId: allEquipment[3].id,
        customerId: 'cust_001',
        customerName: 'Tampa Convention Center',
        siteAddress: '333 S Franklin St, Tampa, FL 33602',
        contactName: 'Michael Rodriguez',
        contactPhone: '(813) 274-8511',
        contactEmail: 'facilities@tampacc.com',
        issueDescription: 'Routine oil change and filter replacement.',
        status: JobStatus.PENDING,
        technicianId: null,
        technicianName: null,
        assignedAt: null,
      },
      {
        equipmentId: allEquipment[4].id,
        customerId: 'cust_002',
        customerName: 'Sunshine State Construction',
        siteAddress: '1250 Tech Blvd, Tampa, FL 33619',
        contactName: 'Maria Garcia',
        contactPhone: '(813) 555-0456',
        contactEmail: 'm.garcia@suncoastconst.com',
        issueDescription: 'Blade edge worn - replacement required.',
        status: JobStatus.PENDING,
        technicianId: null,
        technicianName: null,
        assignedAt: null,
      },
    ],
  });

  console.log(`✅ Created ${jobs.count} job records`);

  const allJobs = await prisma.job.findMany({
    where: { status: JobStatus.COMPLETED },
    orderBy: { assignedAt: 'desc' },
    take: 5,
  });

  const serviceRecords = [];

  if (allJobs.length >= 1) {
    const sr1 = await prisma.serviceRecord.create({
      data: {
        jobId: allJobs[0].id,
        beforePhotos: [],
        beforeNotes: 'Engine knocking sound audible during startup. Oil level normal.',
        beforeEngineHours: 5850,
        arrivedAt: new Date(fiveDaysAgo.getTime() + 2 * 60 * 60 * 1000),
        isCheckInComplete: true,
        afterPhotos: [],
        diagnosis: 'Worn engine bearings causing knocking noise. Requires bearing replacement.',
        workPerformed: 'Replaced main engine bearings, performed oil flush, replaced oil filter. Tested engine under load - noise eliminated.',
        partsUsed: 'Main bearing set (P/N: 8N-1234), Oil filter (P/N: 1R-0750), Engine oil (15W-40, 10 gal)',
        afterEngineHours: 5852,
        completedAt: new Date(fourDaysAgo.getTime() + 5 * 60 * 60 * 1000),
        isJobComplete: true,
      },
    });
    serviceRecords.push(sr1);
  }

  if (allJobs.length >= 2) {
    const sr2 = await prisma.serviceRecord.create({
      data: {
        jobId: allJobs[1].id,
        beforePhotos: [],
        beforeNotes: 'Track appears loose on right side. Visible sag when equipment is stationary.',
        beforeEngineHours: 3120,
        arrivedAt: new Date(oneWeekAgo.getTime() + 1 * 60 * 60 * 1000),
        isCheckInComplete: true,
        afterPhotos: [],
        diagnosis: 'Track tension below specification. Adjustment required per manufacturer guidelines.',
        workPerformed: 'Adjusted track tension to spec (32-36mm sag). Inspected track links and pins - no wear detected. Greased track rollers.',
        partsUsed: 'Grease (2 tubes)',
        afterEngineHours: 3121,
        completedAt: new Date(oneWeekAgo.getTime() + 3 * 60 * 60 * 1000),
        isJobComplete: true,
      },
    });
    serviceRecords.push(sr2);
  }

  if (allJobs.length >= 3) {
    const sr3 = await prisma.serviceRecord.create({
      data: {
        jobId: allJobs[2].id,
        beforePhotos: [],
        beforeNotes: 'Air filter housing showing dust accumulation. Scheduled maintenance due.',
        beforeEngineHours: 2580,
        arrivedAt: new Date(twoWeeksAgo.getTime() + 3 * 60 * 60 * 1000),
        isCheckInComplete: true,
        afterPhotos: [],
        diagnosis: 'Air filter 80% clogged. Standard replacement interval reached.',
        workPerformed: 'Replaced primary and secondary air filters. Cleaned housing. Performed multi-point inspection.',
        partsUsed: 'Primary air filter (P/N: 6I-2501), Secondary air filter (P/N: 6I-2502)',
        afterEngineHours: 2581,
        completedAt: new Date(twoWeeksAgo.getTime() + 4 * 60 * 60 * 1000),
        isJobComplete: true,
      },
    });
    serviceRecords.push(sr3);
  }

  if (allJobs.length >= 4) {
    const sr4 = await prisma.serviceRecord.create({
      data: {
        jobId: allJobs[3].id,
        beforePhotos: [],
        beforeNotes: 'Coolant leak visible under radiator. Puddle forming after operation.',
        beforeEngineHours: 4480,
        arrivedAt: new Date(threeWeeksAgo.getTime() + 2 * 60 * 60 * 1000),
        isCheckInComplete: true,
        afterPhotos: [],
        diagnosis: 'Radiator lower seal degraded. Coolant level 2 quarts low.',
        workPerformed: 'Replaced radiator seals, pressure tested cooling system (passed at 15 PSI), refilled coolant to spec, bled air from system.',
        partsUsed: 'Radiator seal kit (P/N: 9X-5423), Coolant (50/50 mix, 2 gal)',
        afterEngineHours: 4482,
        completedAt: new Date(threeWeeksAgo.getTime() + 6 * 60 * 60 * 1000),
        isJobComplete: true,
      },
    });
    serviceRecords.push(sr4);
  }

  if (allJobs.length >= 5) {
    const sr5 = await prisma.serviceRecord.create({
      data: {
        jobId: allJobs[4].id,
        beforePhotos: [],
        beforeNotes: 'Dashboard warning lights: battery and alternator indicators illuminated.',
        beforeEngineHours: 3080,
        arrivedAt: new Date(threeWeeksAgo.getTime() + 1 * 60 * 60 * 1000),
        isCheckInComplete: true,
        afterPhotos: [],
        diagnosis: 'Alternator belt loose (1.5" deflection vs spec 0.5"). Charging voltage low at 12.8V.',
        workPerformed: 'Adjusted alternator belt tension to spec. Tested charging system - now 14.2V at idle. Cleared fault codes.',
        partsUsed: 'None - adjustment only',
        afterEngineHours: 3081,
        completedAt: new Date(threeWeeksAgo.getTime() + 2.5 * 60 * 60 * 1000),
        isJobComplete: true,
      },
    });
    serviceRecords.push(sr5);
  }

  console.log(`✅ Created ${serviceRecords.length} service records`);

  await prisma.job.update({
    where: { id: allJobs[0].id },
    data: { status: JobStatus.COMPLETED },
  });

  console.log('✅ Updated job statuses');
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
