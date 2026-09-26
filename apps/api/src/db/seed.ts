import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const SOURCE = "https://www.bennett.edu.in/";
const INFRASTRUCTURE_SOURCE =
  "https://www.bennett.edu.in/bennett-life/infrastructure/";
const WELLNESS_SOURCE =
  "https://www.bennett.edu.in/student-services/wellness-centre/";
const STUDENT_SERVICES_SOURCE =
  "https://www.bennett.edu.in/bennett-life/student-services/";
const CAFETERIA_SOURCE =
  "https://www.bennett.edu.in/Infrastructure/cafeteria-where-food-is-served-with-love/";
const HOSTEL_SOURCE =
  "https://www.bennett.edu.in/bennett-life/hostels-at-bu/";
const GALLERY_SOURCE =
  "https://www.bennett.edu.in/bennett-university-galleries/";

const CAMPUS_PHONE = "0120-7199300";
const TOLL_FREE = "1800-103-8484";

async function upsertDiningHours(
  diningId: string,
  hours: {
    dayOfWeek: number;
    openTime?: string;
    closeTime?: string;
    isClosed?: boolean;
  }[]
) {
  for (const hour of hours) {
    await prisma.diningHours.upsert({
      where: {
        diningId_dayOfWeek: {
          diningId,
          dayOfWeek: hour.dayOfWeek,
        },
      },
      update: {
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed ?? false,
      },
      create: {
        diningId,
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        isClosed: hour.isClosed ?? false,
      },
    });
  }
}

async function main() {
  console.log("Seeding campus database...");

  // ==================================================
  // LOCATIONS
  // ==================================================

  const sportsComplex = await prisma.campusLocation.upsert({
    where: { id: "sports-complex" },

    update: {
      name: "Sports Complex",
      category: "sports",
      description:
        "Dedicated sports complex in K Block with indoor sports facilities, gym, badminton, squash and an indoor swimming pool.",
      building: "K Block",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "sports-complex",
      name: "Sports Complex",
      category: "sports",
      description:
        "Dedicated sports complex in K Block with indoor sports facilities, gym, badminton, squash and an indoor swimming pool.",
      building: "K Block",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const centralLibrary = await prisma.campusLocation.upsert({
    where: { id: "central-library" },

    update: {
      name: "Central Library",
      category: "library",
      description:
        "Primary library facility supporting university learning and research resources.",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "central-library",
      name: "Central Library",
      category: "library",
      description:
        "Primary library facility supporting university learning and research resources.",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const lawLibrary = await prisma.campusLocation.upsert({
    where: { id: "law-library" },

    update: {
      name: "Law Library",
      category: "library",
      description:
        "Dedicated law library facility containing legal learning and research resources.",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "law-library",
      name: "Law Library",
      category: "library",
      description:
        "Dedicated law library facility containing legal learning and research resources.",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const mBlockLibrary = await prisma.campusLocation.upsert({
    where: { id: "m-block-library" },

    update: {
      name: "M Block Library",
      category: "library",
      description:
        "Additional reading and resource facility located in M Block.",
      building: "M Block",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "m-block-library",
      name: "M Block Library",
      category: "library",
      description:
        "Additional reading and resource facility located in M Block.",
      building: "M Block",
      sourceUrl: INFRASTRUCTURE_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const wellnessCentre = await prisma.campusLocation.upsert({
    where: { id: "wellness-centre" },

    update: {
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "On-campus medical facility providing round-the-clock medical facilities and ambulance support.",
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "wellness-centre",
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "On-campus medical facility providing round-the-clock medical facilities and ambulance support.",
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const cafeteria = await prisma.campusLocation.upsert({
    where: { id: "main-cafeteria" },

    update: {
      name: "Main Cafeteria",
      category: "dining",
      description:
        "Two-storeyed main campus cafeteria and vegetarian mess serving regular student meals.",
      sourceUrl: CAFETERIA_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "main-cafeteria",
      name: "Main Cafeteria",
      category: "dining",
      description:
        "Two-storeyed main campus cafeteria and vegetarian mess serving regular student meals.",
      sourceUrl: CAFETERIA_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const aBlock = await prisma.campusLocation.upsert({
    where: { id: "a-block" },

    update: {
      name: "A Block",
      category: "academic-block",
      description:
        "Academic and administrative block containing classrooms, lecture halls, faculty offices and important administrative offices.",
      building: "A Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "a-block",
      name: "A Block",
      category: "academic-block",
      description:
        "Academic and administrative block containing classrooms, lecture halls, faculty offices and important administrative offices.",
      building: "A Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const bBlock = await prisma.campusLocation.upsert({
    where: { id: "b-block" },

    update: {
      name: "B Block",
      category: "academic-block",
      description:
        "Academic block containing departmental foyers, seminar halls and discussion rooms.",
      building: "B Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "b-block",
      name: "B Block",
      category: "academic-block",
      description:
        "Academic block containing departmental foyers, seminar halls and discussion rooms.",
      building: "B Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const mBlock = await prisma.campusLocation.upsert({
    where: { id: "m-block" },

    update: {
      name: "M Block",
      category: "faculty-block",
      description:
        "Faculty block containing faculty rooms, department offices and faculty facilities.",
      building: "M Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "m-block",
      name: "M Block",
      category: "faculty-block",
      description:
        "Faculty block containing faculty rooms, department offices and faculty facilities.",
      building: "M Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const nBlock = await prisma.campusLocation.upsert({
    where: { id: "n-block" },

    update: {
      name: "N Block",
      category: "academic-laboratory-block",
      description:
        "Academic and laboratory block used by the Times School of Media and specialized science facilities, including multimedia examination facilities and research laboratories.",
      building: "N Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "n-block",
      name: "N Block",
      category: "academic-laboratory-block",
      description:
        "Academic and laboratory block used by the Times School of Media and specialized science facilities, including multimedia examination facilities and research laboratories.",
      building: "N Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const pBlock = await prisma.campusLocation.upsert({
    where: { id: "p-block" },

    update: {
      name: "P Block",
      category: "academic-examination-block",
      description:
        "Large academic block containing lecture halls, smart classrooms and engineering laboratories. It is also used for university-wide examinations.",
      building: "P Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "p-block",
      name: "P Block",
      category: "academic-examination-block",
      description:
        "Large academic block containing lecture halls, smart classrooms and engineering laboratories. It is also used for university-wide examinations.",
      building: "P Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const cBlock = await prisma.campusLocation.upsert({
    where: { id: "c-block" },

    update: {
      name: "C Block",
      category: "hostel",
      description:
        "Student residential and hostel block.",
      building: "C Block",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "c-block",
      name: "C Block",
      category: "hostel",
      description:
        "Student residential and hostel block.",
      building: "C Block",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const dBlock = await prisma.campusLocation.upsert({
    where: { id: "d-block" },

    update: {
      name: "D Block",
      category: "hostel",
      description:
        "Student residential and hostel block.",
      building: "D Block",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "d-block",
      name: "D Block",
      category: "hostel",
      description:
        "Student residential and hostel block.",
      building: "D Block",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const hostelBlocks = await prisma.campusLocation.upsert({
    where: { id: "hostel-blocks" },

    update: {
      name: "Hostel Blocks C-J",
      category: "hostel",
      description:
        "Student residential facilities spread across C, D, E, F, G, H, I and J Blocks.",
      building: "C-J Blocks",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "hostel-blocks",
      name: "Hostel Blocks C-J",
      category: "hostel",
      description:
        "Student residential facilities spread across C, D, E, F, G, H, I and J Blocks.",
      building: "C-J Blocks",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },
  });

  const auditorium1 = await prisma.campusLocation.upsert({
    where: { id: "auditorium-1" },

    update: {
      name: "Auditorium 1",
      category: "venue",
      description:
        "Indoor university auditorium used for major university events and activities.",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "auditorium-1",
      name: "Auditorium 1",
      category: "venue",
      description:
        "Indoor university auditorium used for major university events and activities.",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const auditorium2 = await prisma.campusLocation.upsert({
    where: { id: "auditorium-2" },

    update: {
      name: "Auditorium 2",
      category: "venue",
      description:
        "Indoor university auditorium used for major university events and activities.",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "auditorium-2",
      name: "Auditorium 2",
      category: "venue",
      description:
        "Indoor university auditorium used for major university events and activities.",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const openAirAmphitheatre =
    await prisma.campusLocation.upsert({
      where: { id: "open-air-amphitheatre" },

      update: {
        name: "Open-Air Amphitheatre",
        category: "venue",
        description:
          "Open-air event venue used for festivals, cultural events and assemblies.",
        sourceUrl: SOURCE,
        verifiedAt: new Date(),
      },

      create: {
        id: "open-air-amphitheatre",
        name: "Open-Air Amphitheatre",
        category: "venue",
        description:
          "Open-air event venue used for festivals, cultural events and assemblies.",
        sourceUrl: SOURCE,
        verifiedAt: new Date(),
      },
    });

  const mainGate = await prisma.campusLocation.upsert({
    where: { id: "main-gate" },

    update: {
      name: "Main Gate",
      category: "security",
      description:
        "Main campus entry point with 24/7 security checkpoint.",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "main-gate",
      name: "Main Gate",
      category: "security",
      description:
        "Main campus entry point with 24/7 security checkpoint.",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  const cseDepartment = await prisma.campusLocation.upsert({
    where: { id: "cse-department" },

    update: {
      name: "CSE Department / Faculty Area",
      category: "department-location",
      description:
        "CSE faculty and administrative facilities are primarily associated with M Block and A/B Blocks, with engineering laboratories also located in P Block.",
      building: "M Block / A-B Blocks / P Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "cse-department",
      name: "CSE Department / Faculty Area",
      category: "department-location",
      description:
        "CSE faculty and administrative facilities are primarily associated with M Block and A/B Blocks, with engineering laboratories also located in P Block.",
      building: "M Block / A-B Blocks / P Block",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  // ==================================================
  // SERVICES
  // ==================================================

  await prisma.campusService.upsert({
    where: { id: "wellness-centre-service" },

    update: {
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "20-bed integrated medical facility with round-the-clock medical facilities and ambulance service.",
      locationId: wellnessCentre.id,
      phone: "0120-7199500",
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "wellness-centre-service",
      name: "Wellness Centre",
      category: "healthcare",
      description:
        "20-bed integrated medical facility with round-the-clock medical facilities and ambulance service.",
      locationId: wellnessCentre.id,
      phone: "0120-7199500",
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "counselling-centre" },

    update: {
      name: "Counselling Centre",
      category: "counselling",
      description:
        "Student counselling support provided through the university counselling centre.",
      phone: "0120-7199500 / 9289109580",
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "counselling-centre",
      name: "Counselling Centre",
      category: "counselling",
      description:
        "Student counselling support provided through the university counselling centre.",
      phone: "0120-7199500 / 9289109580",
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "campus-transportation" },

    update: {
      name: "Campus Transportation",
      category: "transportation",
      description:
        "Transportation services are provided for day scholars, resident students, faculty and staff.",
      phone: CAMPUS_PHONE,
      sourceUrl: STUDENT_SERVICES_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "campus-transportation",
      name: "Campus Transportation",
      category: "transportation",
      description:
        "Transportation services are provided for day scholars, resident students, faculty and staff.",
      phone: CAMPUS_PHONE,
      sourceUrl: STUDENT_SERVICES_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "bu-basiks" },

    update: {
      name: "BU Basiks",
      category: "convenience-store",
      description:
        "Campus convenience store providing everyday essentials.",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "bu-basiks",
      name: "BU Basiks",
      category: "convenience-store",
      description:
        "Campus convenience store providing everyday essentials.",
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "atm" },

    update: {
      name: "ATM",
      category: "banking",
      description: "24/7 ATM facility available on campus.",
      sourceUrl: GALLERY_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "atm",
      name: "ATM",
      category: "banking",
      description: "24/7 ATM facility available on campus.",
      sourceUrl: GALLERY_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "registrar-office" },

    update: {
      name: "Registrar Office",
      category: "administration",
      description:
        "University administrative office handling registration and official administrative queries.",
      locationId: aBlock.id,
      phone: "+91-120-7199326",
      email: "Ashwani.Varshney@bennett.edu.in",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "registrar-office",
      name: "Registrar Office",
      category: "administration",
      description:
        "University administrative office handling registration and official administrative queries.",
      locationId: aBlock.id,
      phone: "+91-120-7199326",
      email: "Ashwani.Varshney@bennett.edu.in",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "examination-office" },

    update: {
      name: "Examination Office",
      category: "examinations",
      description:
        "Office of the Controller of Examinations. Handles examination-related administrative operations.",
      locationId: aBlock.id,
      phone: CAMPUS_PHONE,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "examination-office",
      name: "Examination Office",
      category: "examinations",
      description:
        "Office of the Controller of Examinations. Handles examination-related administrative operations.",
      locationId: aBlock.id,
      phone: CAMPUS_PHONE,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "placement-office" },

    update: {
      name: "Placement / Corporate Relations",
      category: "career-services",
      description:
        "Placement and corporate relations office located next to Auditorium 1 and responsible for corporate recruitment activities.",
      locationId: auditorium1.id,
      phone: "+91-9810461112",
      email: "rakesh.singh@bennett.edu.in",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "placement-office",
      name: "Placement / Corporate Relations",
      category: "career-services",
      description:
        "Placement and corporate relations office located next to Auditorium 1 and responsible for corporate recruitment activities.",
      locationId: auditorium1.id,
      phone: "+91-9810461112",
      email: "rakesh.singh@bennett.edu.in",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "it-support" },

    update: {
      name: "IT Support",
      category: "technical-support",
      description:
        "University IT support available through the main campus IVR.",
      phone: CAMPUS_PHONE,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "it-support",
      name: "IT Support",
      category: "technical-support",
      description:
        "University IT support available through the main campus IVR.",
      phone: CAMPUS_PHONE,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "hostel-mess-allocation" },

    update: {
      name: "Hostel & Mess Allocation",
      category: "hostel",
      description:
        "Handles hostel and mess allocation-related queries through the university main IVR.",
      locationId: hostelBlocks.id,
      phone: CAMPUS_PHONE,
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "hostel-mess-allocation",
      name: "Hostel & Mess Allocation",
      category: "hostel",
      description:
        "Handles hostel and mess allocation-related queries through the university main IVR.",
      locationId: hostelBlocks.id,
      phone: CAMPUS_PHONE,
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "student-affairs" },

    update: {
      name: "Student Affairs",
      category: "student-services",
      description:
        "Student affairs and campus-life support.",
      phone: CAMPUS_PHONE,
      email: "notice@bennett.edu.in",
      sourceUrl: STUDENT_SERVICES_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "student-affairs",
      name: "Student Affairs",
      category: "student-services",
      description:
        "Student affairs and campus-life support.",
      phone: CAMPUS_PHONE,
      email: "notice@bennett.edu.in",
      sourceUrl: STUDENT_SERVICES_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.campusService.upsert({
    where: { id: "general-campus-support" },

    update: {
      name: "General Campus Support",
      category: "support",
      description:
        "General university campus support and information.",
      phone: CAMPUS_PHONE,
      email: "support@bennett.edu.in",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "general-campus-support",
      name: "General Campus Support",
      category: "support",
      description:
        "General university campus support and information.",
      phone: CAMPUS_PHONE,
      email: "support@bennett.edu.in",
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  // ==================================================
  // DINING
  // ==================================================

  const dining = [
    {
      id: "main-cafeteria",
      name: "Main Cafeteria",
      type: "cafeteria",
      description:
        "Two-storeyed main central cafeteria and vegetarian mess.",
      locationId: cafeteria.id,
    },

    {
      id: "non-veg-cafeteria",
      name: "Non-Veg Cafeteria",
      type: "cafeteria",
      description:
        "Dedicated paid cafeteria providing non-vegetarian food options.",
      locationId: cafeteria.id,
    },

    {
      id: "dominos",
      name: "Domino's",
      type: "restaurant",
      description:
        "Campus fast-food outlet serving pizzas, sides and desserts.",
      locationId: cafeteria.id,
    },

    {
      id: "subway",
      name: "Subway",
      type: "restaurant",
      description:
        "Campus sandwich and wrap outlet.",
      locationId: cafeteria.id,
    },

    {
      id: "southern-stories",
      name: "Southern Stories",
      type: "restaurant",
      description:
        "South Indian quick-service food outlet.",
      locationId: cafeteria.id,
    },

    {
      id: "maggi-point",
      name: "Maggi Point",
      type: "food-joint",
      description:
        "Street-style fast-casual food and late-night quick-bite outlet.",
      locationId: cafeteria.id,
    },

    {
      id: "kathi-junction",
      name: "Kathi Junction",
      type: "food-joint",
      description:
        "Street-style food outlet serving kathi rolls and quick bites.",
      locationId: cafeteria.id,
    },

    {
      id: "snap-eats",
      name: "SnapEats",
      type: "food-joint",
      description:
        "Campus food outlet serving Indian meals and quick food options.",
      locationId: cafeteria.id,
    },

    {
      id: "house-of-chow",
      name: "House of Chow",
      type: "restaurant",
      description:
        "Campus food outlet serving pan-Asian style food options.",
      locationId: cafeteria.id,
    },

    {
      id: "nescafe",
      name: "Nescafé",
      type: "cafe",
      description:
        "Coffee, hot beverages, shakes and light confectionery outlet.",
    },

    {
      id: "quench",
      name: "Quench Juicing Centre",
      type: "beverage",
      description:
        "Juice, shake and hydration outlet located at K Block Sports Complex.",
      locationId: sportsComplex.id,
    },

    {
      id: "etl-food-zone",
      name: "ETL Food Zone",
      type: "food-zone",
      description:
        "Campus food truck and street-food cluster near the student residential area.",
      locationId: hostelBlocks.id,
    },
  ];

  for (const outlet of dining) {
    await prisma.diningOutlet.upsert({
      where: {
        id: outlet.id,
      },

      update: {
        name: outlet.name,
        type: outlet.type,
        description: outlet.description,
        locationId: outlet.locationId,
        sourceUrl: SOURCE,
        verifiedAt: new Date(),
      },

      create: {
        id: outlet.id,
        name: outlet.name,
        type: outlet.type,
        description: outlet.description,
        locationId: outlet.locationId,
        sourceUrl: SOURCE,
        verifiedAt: new Date(),
      },
    });
  }

  // ==================================================
  // DINING HOURS
  // ==================================================

  const allDays = [0, 1, 2, 3, 4, 5, 6];

  // Main Cafeteria
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("main-cafeteria", [
      {
        dayOfWeek,
        openTime: "07:30",
        closeTime: "22:00",
      },
    ]);
  }

  // Non-Veg Cafeteria
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("non-veg-cafeteria", [
      {
        dayOfWeek,
        openTime: "12:00",
        closeTime: "00:00",
      },
    ]);
  }

  // Domino's
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("dominos", [
      {
        dayOfWeek,
        openTime: "11:00",
        closeTime: "00:00",
      },
    ]);
  }

  // Subway
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("subway", [
      {
        dayOfWeek,
        openTime: "10:00",
        closeTime: "00:00",
      },
    ]);
  }

  // Southern Stories
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("southern-stories", [
      {
        dayOfWeek,
        openTime: "08:00",
        closeTime: "23:00",
      },
    ]);
  }

  // Maggi Point
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("maggi-point", [
      {
        dayOfWeek,
        openTime: "00:00",
        closeTime: "23:59",
      },
    ]);
  }

  // Kathi Junction
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("kathi-junction", [
      {
        dayOfWeek,
        openTime: "00:00",
        closeTime: "23:59",
      },
    ]);
  }

  // SnapEats
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("snap-eats", [
      {
        dayOfWeek,
        openTime: "00:00",
        closeTime: "03:00",
      },
    ]);
  }

  // House of Chow
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("house-of-chow", [
      {
        dayOfWeek,
        openTime: "00:00",
        closeTime: "03:00",
      },
    ]);
  }

  // Nescafé
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("nescafe", [
      {
        dayOfWeek,
        openTime: "08:30",
        closeTime: "00:00",
      },
    ]);
  }

  // Quench
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("quench", [
      {
        dayOfWeek,
        openTime: "06:00",
        closeTime: "10:00",
      },
      {
        dayOfWeek,
        openTime: "16:00",
        closeTime: "21:00",
      },
    ]);
  }

  // ETL Food Zone
  for (const dayOfWeek of allDays) {
    await upsertDiningHours("etl-food-zone", [
      {
        dayOfWeek,
        openTime: "16:00",
        closeTime: "02:00",
      },
    ]);
  }

  // ==================================================
  // EMERGENCY / IMPORTANT CONTACTS
  // ==================================================

  await prisma.emergencyContact.upsert({
    where: {
      id: "campus-wellness",
    },

    update: {
      name: "Wellness Centre",
      category: "medical",
      phone: "0120-7199500",
      description:
        "On-campus medical facility providing round-the-clock medical facilities and ambulance support.",
      available24x7: true,
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "campus-wellness",
      name: "Wellness Centre",
      category: "medical",
      phone: "0120-7199500",
      description:
        "On-campus medical facility providing round-the-clock medical facilities and ambulance support.",
      available24x7: true,
      sourceUrl: WELLNESS_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.emergencyContact.upsert({
    where: {
      id: "campus-emergency",
    },

    update: {
      name: "Campus Emergency",
      category: "emergency",
      phone: CAMPUS_PHONE,
      alternatePhone: TOLL_FREE,
      description:
        "Campus emergency response can be reached through the main university line. Press 0 for the emergency response desk.",
      available24x7: true,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "campus-emergency",
      name: "Campus Emergency",
      category: "emergency",
      phone: CAMPUS_PHONE,
      alternatePhone: TOLL_FREE,
      description:
        "Campus emergency response can be reached through the main university line. Press 0 for the emergency response desk.",
      available24x7: true,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.emergencyContact.upsert({
    where: {
      id: "campus-security",
    },

    update: {
      name: "Campus Security & Transport",
      category: "security",
      phone: CAMPUS_PHONE,
      alternatePhone: TOLL_FREE,
      description:
        "Campus security and transport support. Press 6 on the main university line.",
      available24x7: true,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "campus-security",
      name: "Campus Security & Transport",
      category: "security",
      phone: CAMPUS_PHONE,
      alternatePhone: TOLL_FREE,
      description:
        "Campus security and transport support. Press 6 on the main university line.",
      available24x7: true,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.emergencyContact.upsert({
    where: {
      id: "it-support-contact",
    },

    update: {
      name: "IT Support",
      category: "technical-support",
      phone: CAMPUS_PHONE,
      alternatePhone: "Extension 4",
      description:
        "Press 4 on the main university IVR for IT support.",
      available24x7: false,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "it-support-contact",
      name: "IT Support",
      category: "technical-support",
      phone: CAMPUS_PHONE,
      alternatePhone: "Extension 4",
      description:
        "Press 4 on the main university IVR for IT support.",
      available24x7: false,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.emergencyContact.upsert({
    where: {
      id: "hostel-mess-contact",
    },

    update: {
      name: "Hostel & Mess Allocation",
      category: "hostel",
      phone: CAMPUS_PHONE,
      alternatePhone: "Extension 7",
      description:
        "Press 7 on the main university IVR for hostel and mess allocation queries.",
      available24x7: false,
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "hostel-mess-contact",
      name: "Hostel & Mess Allocation",
      category: "hostel",
      phone: CAMPUS_PHONE,
      alternatePhone: "Extension 7",
      description:
        "Press 7 on the main university IVR for hostel and mess allocation queries.",
      available24x7: false,
      sourceUrl: HOSTEL_SOURCE,
      verifiedAt: new Date(),
    },
  });

  await prisma.emergencyContact.upsert({
    where: {
      id: "examination-contact",
    },

    update: {
      name: "Examination Office",
      category: "examinations",
      phone: CAMPUS_PHONE,
      alternatePhone: "Extension 5",
      description:
        "Press 5 on the main university IVR for the Office of the Controller of Examinations.",
      available24x7: false,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },

    create: {
      id: "examination-contact",
      name: "Examination Office",
      category: "examinations",
      phone: CAMPUS_PHONE,
      alternatePhone: "Extension 5",
      description:
        "Press 5 on the main university IVR for the Office of the Controller of Examinations.",
      available24x7: false,
      sourceUrl: SOURCE,
      verifiedAt: new Date(),
    },
  });

  console.log("Campus database seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });