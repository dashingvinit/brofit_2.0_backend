/**
 * Seed script for Brofit 2.0
 * Clears all data for a given org and fills it with realistic dummy data.
 *
 * Usage:
 *   node prisma/seed.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ORG_ID = "org_35btlqrEAbmUqwLTpAUKZG0K2G0";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dateOnly(date) {
  return new Date(date.toISOString().split("T")[0]);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Clear org data (in FK-safe order) ───────────────────────────────────────

async function clearOrg(orgId) {
  console.log("🗑  Clearing existing org data...");
  await prisma.attendanceHourlySnapshot.deleteMany({ where: { orgId } });
  await prisma.attendance.deleteMany({ where: { orgId } });
  await prisma.trainerPayout.deleteMany({ where: { orgId } });
  await prisma.payment.deleteMany({ where: { orgId } });
  await prisma.training.deleteMany({ where: { orgId } });
  await prisma.membership.deleteMany({ where: { orgId } });
  await prisma.offer.deleteMany({ where: { orgId } });
  await prisma.planVariant.deleteMany({ where: { planType: { orgId } } });
  await prisma.planType.deleteMany({ where: { orgId } });
  await prisma.trainer.deleteMany({ where: { orgId } });
  await prisma.dailyActivitySnapshot.deleteMany({ where: { orgId } });
  await prisma.expense.deleteMany({ where: { orgId } });
  await prisma.investment.deleteMany({ where: { orgId } });
  // Clear member self-referral before deleting members
  await prisma.member.updateMany({ where: { orgId }, data: { referredById: null } });
  await prisma.member.deleteMany({ where: { orgId } });
  console.log("✓  Cleared");
}

// ─── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  await clearOrg(ORG_ID);

  // ── 1. Plan Types & Variants ──────────────────────────────────────────────

  console.log("📋  Seeding plans...");

  const membershipType = await prisma.planType.create({
    data: {
      orgId: ORG_ID,
      name: "General Membership",
      description: "Access to gym floor, cardio & free weights",
      category: "membership",
      isActive: true,
    },
  });

  const premiumType = await prisma.planType.create({
    data: {
      orgId: ORG_ID,
      name: "Premium Membership",
      description: "All-access: gym + group classes + sauna",
      category: "membership",
      isActive: true,
    },
  });

  const ptType = await prisma.planType.create({
    data: {
      orgId: ORG_ID,
      name: "Personal Training",
      description: "1-on-1 sessions with a certified trainer",
      category: "training",
      isActive: true,
    },
  });

  const groupType = await prisma.planType.create({
    data: {
      orgId: ORG_ID,
      name: "Group Training",
      description: "Small group sessions (max 5 people)",
      category: "training",
      isActive: true,
    },
  });

  // Membership variants
  const mem1M = await prisma.planVariant.create({ data: { planTypeId: membershipType.id, durationDays: 30,  durationLabel: "1 Month",  price: 1200, isActive: true } });
  const mem3M = await prisma.planVariant.create({ data: { planTypeId: membershipType.id, durationDays: 90,  durationLabel: "3 Months", price: 3200, isActive: true } });
  const mem6M = await prisma.planVariant.create({ data: { planTypeId: membershipType.id, durationDays: 180, durationLabel: "6 Months", price: 5800, isActive: true } });
  const mem1Y = await prisma.planVariant.create({ data: { planTypeId: membershipType.id, durationDays: 365, durationLabel: "1 Year",   price: 9999, isActive: true } });

  const pre1M = await prisma.planVariant.create({ data: { planTypeId: premiumType.id, durationDays: 30,  durationLabel: "1 Month",  price: 2200, isActive: true } });
  const pre3M = await prisma.planVariant.create({ data: { planTypeId: premiumType.id, durationDays: 90,  durationLabel: "3 Months", price: 5999, isActive: true } });
  const pre6M = await prisma.planVariant.create({ data: { planTypeId: premiumType.id, durationDays: 180, durationLabel: "6 Months", price: 10500, isActive: true } });

  // Training variants
  const pt1M  = await prisma.planVariant.create({ data: { planTypeId: ptType.id, durationDays: 30,  durationLabel: "1 Month",  price: 3500, isActive: true } });
  const pt3M  = await prisma.planVariant.create({ data: { planTypeId: ptType.id, durationDays: 90,  durationLabel: "3 Months", price: 9500, isActive: true } });
  const pt6M  = await prisma.planVariant.create({ data: { planTypeId: ptType.id, durationDays: 180, durationLabel: "6 Months", price: 17000, isActive: true } });

  const grp1M = await prisma.planVariant.create({ data: { planTypeId: groupType.id, durationDays: 30,  durationLabel: "1 Month",  price: 2000, isActive: true } });
  const grp3M = await prisma.planVariant.create({ data: { planTypeId: groupType.id, durationDays: 90,  durationLabel: "3 Months", price: 5400, isActive: true } });

  console.log("✓  Plans done");

  // ── 2. Offers ─────────────────────────────────────────────────────────────

  console.log("🎁  Seeding offers...");

  const summerOffer = await prisma.offer.create({
    data: {
      orgId: ORG_ID,
      type: "promo",
      title: "Summer Kickstart",
      description: "Flat ₹500 off on any 3-month plan",
      discountType: "flat",
      discountValue: 500,
      appliesTo: "both",
      isActive: true,
      startDate: daysAgo(30),
      endDate: daysFromNow(30),
      code: "SUMMER500",
    },
  });

  const comboOffer = await prisma.offer.create({
    data: {
      orgId: ORG_ID,
      type: "discount",
      title: "Combo Deal – Gym + PT",
      description: "Dead hours special: membership + training at a flat rate",
      discountType: "flat",
      discountValue: 3200,
      appliesTo: "both",
      isActive: true,
      startDate: daysAgo(60),
      endDate: daysFromNow(15),
      code: "COMBO3K",
    },
  });

  const newYearOffer = await prisma.offer.create({
    data: {
      orgId: ORG_ID,
      type: "event",
      title: "New Year Resolution",
      description: "20% off on annual memberships",
      discountType: "percentage",
      discountValue: 20,
      appliesTo: "membership",
      isActive: false, // expired
      startDate: daysAgo(120),
      endDate: daysAgo(60),
    },
  });

  const referralOffer = await prisma.offer.create({
    data: {
      orgId: ORG_ID,
      type: "referral",
      title: "Refer & Earn",
      description: "Refer a friend and get ₹300 off your next renewal",
      appliesTo: "membership",
      rewardAmount: 300,
      isActive: true,
    },
  });

  const loyaltyOffer = await prisma.offer.create({
    data: {
      orgId: ORG_ID,
      type: "discount",
      title: "Loyalty Discount",
      description: "10% off for members renewing 6-month premium",
      discountType: "percentage",
      discountValue: 10,
      appliesTo: "membership",
      isActive: true,
      code: "LOYAL10",
    },
  });

  console.log("✓  Offers done");

  // ── 3. Trainers ───────────────────────────────────────────────────────────

  console.log("🏋️  Seeding trainers...");

  const trainerRaj = await prisma.trainer.create({
    data: { orgId: ORG_ID, name: "Rajesh Kumar",  splitPercent: 60, isActive: true },
  });
  const trainerPriya = await prisma.trainer.create({
    data: { orgId: ORG_ID, name: "Priya Sharma",  splitPercent: 65, isActive: true },
  });
  const trainerArjun = await prisma.trainer.create({
    data: { orgId: ORG_ID, name: "Arjun Mehta",   splitPercent: 55, isActive: true },
  });
  const trainerNeha = await prisma.trainer.create({
    data: { orgId: ORG_ID, name: "Neha Verma",    splitPercent: 60, isActive: false },
  });

  console.log("✓  Trainers done");

  // ── 4. Members ────────────────────────────────────────────────────────────

  console.log("👥  Seeding members...");

  const memberData = [
    { firstName: "Aarav",    lastName: "Singh",    phone: "9876543201", email: "aarav.singh@gmail.com",    gender: "Male",   joinDaysAgo: 365, dob: "1995-03-15", active: true  },
    { firstName: "Diya",     lastName: "Patel",    phone: "9876543202", email: "diya.patel@gmail.com",     gender: "Female", joinDaysAgo: 300, dob: "1998-07-22", active: true  },
    { firstName: "Vikram",   lastName: "Rao",      phone: "9876543203", email: "vikram.rao@gmail.com",     gender: "Male",   joinDaysAgo: 280, dob: "1990-11-05", active: true  },
    { firstName: "Ananya",   lastName: "Nair",     phone: "9876543204", email: "ananya.nair@gmail.com",    gender: "Female", joinDaysAgo: 250, dob: "1997-01-30", active: true  },
    { firstName: "Rohit",    lastName: "Gupta",    phone: "9876543205", email: "rohit.gupta@gmail.com",    gender: "Male",   joinDaysAgo: 220, dob: "1993-05-18", active: true  },
    { firstName: "Kavya",    lastName: "Iyer",     phone: "9876543206", email: "kavya.iyer@gmail.com",     gender: "Female", joinDaysAgo: 200, dob: "2000-09-12", active: true  },
    { firstName: "Siddharth",lastName: "Joshi",   phone: "9876543207", email: "sid.joshi@gmail.com",      gender: "Male",   joinDaysAgo: 185, dob: "1992-02-28", active: true  },
    { firstName: "Meera",    lastName: "Kapoor",   phone: "9876543208", email: "meera.kapoor@gmail.com",   gender: "Female", joinDaysAgo: 160, dob: "1999-06-08", active: true  },
    { firstName: "Aryan",    lastName: "Malhotra", phone: "9876543209", email: "aryan.m@gmail.com",        gender: "Male",   joinDaysAgo: 140, dob: "1996-12-20", active: true  },
    { firstName: "Sneha",    lastName: "Reddy",    phone: "9876543210", email: "sneha.reddy@gmail.com",    gender: "Female", joinDaysAgo: 120, dob: "2001-04-03", active: true  },
    { firstName: "Kabir",    lastName: "Sharma",   phone: "9876543211", email: "kabir.sharma@gmail.com",   gender: "Male",   joinDaysAgo: 100, dob: "1994-08-14", active: true  },
    { firstName: "Pooja",    lastName: "Agarwal",  phone: "9876543212", email: "pooja.agarwal@gmail.com",  gender: "Female", joinDaysAgo:  90, dob: "1997-10-25", active: true  },
    { firstName: "Nikhil",   lastName: "Bhatia",   phone: "9876543213", email: "nikhil.b@gmail.com",       gender: "Male",   joinDaysAgo:  75, dob: "1991-03-07", active: true  },
    { firstName: "Riya",     lastName: "Desai",    phone: "9876543214", email: "riya.desai@gmail.com",     gender: "Female", joinDaysAgo:  60, dob: "2002-11-17", active: true  },
    { firstName: "Aditya",   lastName: "Verma",    phone: "9876543215", email: "aditya.verma@gmail.com",   gender: "Male",   joinDaysAgo:  45, dob: "1989-07-01", active: true  },
    { firstName: "Ishaan",   lastName: "Chopra",   phone: "9876543216", email: "ishaan.c@gmail.com",       gender: "Male",   joinDaysAgo:  30, dob: "2000-01-19", active: true  },
    { firstName: "Tanvi",    lastName: "Mishra",   phone: "9876543217", email: "tanvi.m@gmail.com",        gender: "Female", joinDaysAgo:  20, dob: "1998-05-06", active: true  },
    { firstName: "Harsh",    lastName: "Pandey",   phone: "9876543218", email: "harsh.pandey@gmail.com",   gender: "Male",   joinDaysAgo: 400, dob: "1988-09-23", active: false },
    { firstName: "Simran",   lastName: "Kaur",     phone: "9876543219", email: "simran.kaur@gmail.com",    gender: "Female", joinDaysAgo: 350, dob: "1995-02-14", active: false },
    { firstName: "Rahul",    lastName: "Tiwari",   phone: "9876543220", email: "rahul.t@gmail.com",        gender: "Male",   joinDaysAgo:  15, dob: "1993-06-30", active: true  },
  ];

  const members = [];
  for (const m of memberData) {
    const member = await prisma.member.create({
      data: {
        orgId: ORG_ID,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        email: m.email,
        gender: m.gender,
        dateOfBirth: new Date(m.dob),
        joinDate: daysAgo(m.joinDaysAgo),
        isActive: m.active,
        whatsappOptedIn: Math.random() > 0.4,
        notes: null,
      },
    });
    members.push(member);
  }

  // Set some referrals
  await prisma.member.update({ where: { id: members[2].id }, data: { referredById: members[0].id } });
  await prisma.member.update({ where: { id: members[5].id }, data: { referredById: members[1].id } });
  await prisma.member.update({ where: { id: members[9].id }, data: { referredById: members[3].id } });
  await prisma.member.update({ where: { id: members[14].id }, data: { referredById: members[0].id } });

  console.log(`✓  ${members.length} members done`);

  // ── 5. Memberships ────────────────────────────────────────────────────────

  console.log("📄  Seeding memberships...");

  const paymentMethods = ["cash", "upi", "card", "bank_transfer"];

  async function createMembership(memberId, variant, startDaysAgo, offerId = null, discountOverride = null) {
    const startDate = daysAgo(startDaysAgo);
    const endDate = addDays(startDate, variant.durationDays);
    const now = new Date();
    const status = endDate < now ? "expired" : "active";
    const discount = discountOverride !== null ? discountOverride : (offerId ? (offerId === comboOffer.id ? 3200 : offerId === summerOffer.id ? 500 : offerId === newYearOffer.id ? Math.round(variant.price * 0.2) : offerId === loyaltyOffer.id ? Math.round(variant.price * 0.1) : 0) : 0);
    const finalPrice = Math.max(0, variant.price - discount);

    const membership = await prisma.membership.create({
      data: {
        orgId: ORG_ID,
        memberId,
        planVariantId: variant.id,
        startDate,
        endDate,
        status,
        priceAtPurchase: variant.price,
        discountAmount: discount,
        finalPrice,
        offerId: offerId || null,
        autoRenew: Math.random() > 0.7,
      },
    });

    // Record payment for most memberships
    if (Math.random() > 0.15) {
      const paidAt = addDays(startDate, randInt(0, 3));
      await prisma.payment.create({
        data: {
          orgId: ORG_ID,
          memberId,
          membershipId: membership.id,
          amount: finalPrice,
          method: pick(paymentMethods),
          status: "paid",
          paidAt,
          createdAt: paidAt,
        },
      });
    }

    return membership;
  }

  // Active memberships (various plans, started recently)
  await createMembership(members[0].id, mem1Y,  30);
  await createMembership(members[1].id, pre3M,  20, loyaltyOffer.id);
  await createMembership(members[2].id, mem3M,  15, summerOffer.id);
  await createMembership(members[3].id, pre6M,  10);
  await createMembership(members[4].id, mem6M,  45);
  await createMembership(members[5].id, mem1M,   5);
  await createMembership(members[6].id, pre3M,  25, summerOffer.id);
  await createMembership(members[7].id, mem3M,  35);
  await createMembership(members[8].id, mem1Y,  60);
  await createMembership(members[9].id, pre1M,   8);
  await createMembership(members[10].id, mem6M, 70);
  await createMembership(members[11].id, mem1M,  2);
  await createMembership(members[12].id, pre3M, 18);
  await createMembership(members[13].id, mem3M, 12);
  await createMembership(members[14].id, mem1M,  1);
  await createMembership(members[15].id, mem1M,  2);
  await createMembership(members[16].id, pre1M,  5);
  await createMembership(members[19].id, mem1M,  3);

  // Expired memberships (historical)
  await createMembership(members[0].id, mem3M, 200);
  await createMembership(members[1].id, mem6M, 320);
  await createMembership(members[2].id, mem1M, 120);
  await createMembership(members[4].id, mem3M, 180);
  await createMembership(members[7].id, mem1M,  95);
  await createMembership(members[17].id, mem1Y, 430, newYearOffer.id); // inactive member
  await createMembership(members[18].id, pre3M, 380);                  // inactive member

  console.log("✓  Memberships done");

  // ── 6. Trainings ─────────────────────────────────────────────────────────

  console.log("🏃  Seeding trainings...");

  async function createTraining(memberId, variant, trainer, startDaysAgo, offerId = null, discountOverride = null, trainerFixedPayout = null) {
    const startDate = daysAgo(startDaysAgo);
    const endDate = addDays(startDate, variant.durationDays);
    const now = new Date();
    const status = endDate < now ? "expired" : "active";
    const discount = discountOverride !== null ? discountOverride : (offerId === comboOffer.id ? 3200 : offerId === summerOffer.id ? 500 : 0);
    const finalPrice = Math.max(0, variant.price - discount);

    const training = await prisma.training.create({
      data: {
        orgId: ORG_ID,
        memberId,
        planVariantId: variant.id,
        trainerId: trainer.id,
        startDate,
        endDate,
        status,
        priceAtPurchase: variant.price,
        discountAmount: discount,
        finalPrice,
        offerId: offerId || null,
        trainerFixedPayout: trainerFixedPayout,
        autoRenew: false,
      },
    });

    // Record payment for most trainings
    if (Math.random() > 0.2) {
      const paidAt = addDays(startDate, randInt(0, 3));
      await prisma.payment.create({
        data: {
          orgId: ORG_ID,
          memberId,
          trainingId: training.id,
          amount: finalPrice,
          method: pick(paymentMethods),
          status: "paid",
          paidAt,
          createdAt: paidAt,
        },
      });
    }

    return training;
  }

  // Active trainings
  const t1  = await createTraining(members[0].id,  pt3M,  trainerRaj,   20);
  const t2  = await createTraining(members[2].id,  pt1M,  trainerPriya, 10);
  const t3  = await createTraining(members[3].id,  grp3M, trainerArjun, 15);
  const t4  = await createTraining(members[4].id,  pt6M,  trainerRaj,   50);
  const t5  = await createTraining(members[6].id,  grp1M, trainerArjun,  5);
  const t6  = await createTraining(members[8].id,  pt3M,  trainerPriya, 30);
  const t7  = await createTraining(members[10].id, pt1M,  trainerRaj,   18);
  const t8  = await createTraining(members[12].id, grp3M, trainerArjun,  8);
  const t9  = await createTraining(members[14].id, pt1M,  trainerPriya,  1);

  // Combo deal trainings (trainerFixedPayout negotiated)
  const t10 = await createTraining(members[1].id,  pt3M,  trainerRaj,   20, comboOffer.id, 3200, 1200);
  const t11 = await createTraining(members[7].id,  pt1M,  trainerPriya, 12, comboOffer.id, 3200, 400);

  // Group training with Summer offer
  const t12 = await createTraining(members[5].id,  grp1M, trainerArjun, 5, summerOffer.id, 500);

  // Expired trainings (historical)
  const t13 = await createTraining(members[0].id,  pt3M,  trainerRaj,  120);
  const t14 = await createTraining(members[2].id,  pt1M,  trainerPriya, 80);
  const t15 = await createTraining(members[4].id,  grp3M, trainerArjun, 200);
  const t16 = await createTraining(members[17].id, pt6M,  trainerNeha,  400);

  console.log("✓  Trainings done");

  // ── 7. Trainer Payouts ────────────────────────────────────────────────────

  console.log("💰  Seeding trainer payouts...");

  async function recordPayout(training, month, year, splitPercent) {
    const durationDays = 90; // approximate
    const totalMonths = Math.max(1, Math.round(durationDays / 30));
    const monthlyRevenue = training.finalPrice / totalMonths;
    const amount = training.trainerFixedPayout != null
      ? parseFloat((training.trainerFixedPayout / totalMonths).toFixed(2))
      : parseFloat(((monthlyRevenue * splitPercent) / 100).toFixed(2));

    try {
      await prisma.trainerPayout.create({
        data: {
          orgId: ORG_ID,
          trainerId: training.trainerId,
          trainingId: training.id,
          month,
          year,
          revenueBase: parseFloat(monthlyRevenue.toFixed(2)),
          splitPercent: training.trainerFixedPayout != null ? 0 : splitPercent,
          amount,
          paidAt: new Date(year, month - 1, 28),
          createdAt: new Date(year, month - 1, 28),
        },
      });
    } catch (e) {
      // skip duplicate
    }
  }

  // Pay out some months for active trainings
  await recordPayout(t1,  3, 2026, trainerRaj.splitPercent);
  await recordPayout(t4,  1, 2026, trainerRaj.splitPercent);
  await recordPayout(t4,  2, 2026, trainerRaj.splitPercent);
  await recordPayout(t4,  3, 2026, trainerRaj.splitPercent);
  await recordPayout(t6,  2, 2026, trainerPriya.splitPercent);
  await recordPayout(t6,  3, 2026, trainerPriya.splitPercent);
  await recordPayout(t10, 3, 2026, trainerRaj.splitPercent); // negotiated
  await recordPayout(t13, 9, 2025, trainerRaj.splitPercent); // expired
  await recordPayout(t13,10, 2025, trainerRaj.splitPercent);
  await recordPayout(t13,11, 2025, trainerRaj.splitPercent);
  await recordPayout(t14, 9, 2025, trainerPriya.splitPercent);
  await recordPayout(t15, 6, 2025, trainerArjun.splitPercent);
  await recordPayout(t16, 2, 2025, trainerNeha.splitPercent);

  console.log("✓  Payouts done");

  // ── 8. Attendance ─────────────────────────────────────────────────────────

  console.log("📊  Seeding attendance...");

  const activeMembers = members.filter((m) => m.isActive);

  for (let daysBack = 60; daysBack >= 0; daysBack--) {
    const date = dateOnly(daysAgo(daysBack));
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0) continue; // skip Sundays

    // Attendance count peaks Mon/Wed/Fri, lower Sat/Tue/Thu
    const peakDay = [1, 3, 5].includes(dayOfWeek);
    const count = randInt(peakDay ? 6 : 3, peakDay ? 12 : 8);
    const shuffled = [...activeMembers].sort(() => Math.random() - 0.5).slice(0, count);

    const hourlyCounts = {};

    for (const member of shuffled) {
      const entryHour = pick([6, 7, 7, 8, 9, 17, 18, 18, 19, 20]);
      const stayMins  = randInt(45, 90);
      const entryTime = new Date(date);
      entryTime.setHours(entryHour, randInt(0, 45), 0, 0);
      const exitTime = new Date(entryTime.getTime() + stayMins * 60000);

      await prisma.attendance.create({
        data: {
          orgId: ORG_ID,
          memberId: member.id,
          date,
          entryTime,
          exitTime,
          createdAt: entryTime,
          updatedAt: exitTime,
        },
      });

      hourlyCounts[entryHour] = (hourlyCounts[entryHour] ?? 0) + 1;
    }

    // Hourly snapshots
    for (const [hour, cnt] of Object.entries(hourlyCounts)) {
      await prisma.attendanceHourlySnapshot.upsert({
        where: { orgId_date_hour: { orgId: ORG_ID, date, hour: parseInt(hour) } },
        update: { count: cnt },
        create: { orgId: ORG_ID, date, hour: parseInt(hour), count: cnt },
      });
    }
  }

  console.log("✓  Attendance done");

  // ── 9. Expenses ───────────────────────────────────────────────────────────

  console.log("💸  Seeding expenses...");

  const expenseData = [
    // Monthly recurring
    { amount: 45000, category: "rent",        description: "Monthly gym rent",                 daysBack: 5  },
    { amount: 45000, category: "rent",        description: "Monthly gym rent",                 daysBack: 35 },
    { amount: 45000, category: "rent",        description: "Monthly gym rent",                 daysBack: 65 },
    { amount: 8200,  category: "utilities",   description: "Electricity bill",                 daysBack: 8  },
    { amount: 7900,  category: "utilities",   description: "Electricity bill",                 daysBack: 38 },
    { amount: 8500,  category: "utilities",   description: "Electricity bill",                 daysBack: 68 },
    { amount: 1200,  category: "utilities",   description: "Water & internet",                 daysBack: 10 },
    { amount: 1200,  category: "utilities",   description: "Water & internet",                 daysBack: 40 },
    // Staff
    { amount: 18000, category: "staff",       description: "Cleaning & support staff salaries",daysBack: 3  },
    { amount: 18000, category: "staff",       description: "Cleaning & support staff salaries",daysBack: 33 },
    { amount: 18000, category: "staff",       description: "Cleaning & support staff salaries",daysBack: 63 },
    // Equipment
    { amount: 32000, category: "equipment",   description: "New treadmill (2nd unit)",         daysBack: 45 },
    { amount: 5500,  category: "maintenance", description: "Treadmill belt replacement",       daysBack: 20 },
    { amount: 3200,  category: "maintenance", description: "AC service & filter cleaning",     daysBack: 55 },
    { amount: 2800,  category: "equipment",   description: "Resistance bands & foam rollers",  daysBack: 15 },
    // Marketing
    { amount: 4000,  category: "marketing",   description: "Instagram / Meta ads – March",     daysBack: 30 },
    { amount: 4500,  category: "marketing",   description: "Instagram / Meta ads – April",     daysBack: 5  },
    { amount: 1500,  category: "marketing",   description: "Flex banner printing",             daysBack: 22 },
    // Other
    { amount: 800,   category: "other",       description: "First aid kit restock",            daysBack: 12 },
    { amount: 2200,  category: "other",       description: "Locker room renovation (partial)", daysBack: 50 },
  ];

  for (const e of expenseData) {
    await prisma.expense.create({
      data: {
        orgId: ORG_ID,
        amount: e.amount,
        category: e.category,
        description: e.description,
        date: dateOnly(daysAgo(e.daysBack)),
      },
    });
  }

  console.log("✓  Expenses done");

  // ── 10. Investments ───────────────────────────────────────────────────────

  console.log("📈  Seeding investments...");

  await prisma.investment.createMany({
    data: [
      { orgId: ORG_ID, name: "Olympic Barbell Set (10 bars)", amount: 85000,  date: dateOnly(daysAgo(300)), notes: "Purchased from FitPro India" },
      { orgId: ORG_ID, name: "Cardio Zone Expansion – 3 bikes", amount: 120000, date: dateOnly(daysAgo(200)), notes: "Financed 50% upfront" },
      { orgId: ORG_ID, name: "Gym Management Software (annual)", amount: 24000, date: dateOnly(daysAgo(180)), notes: "Brofit 2.0 subscription" },
      { orgId: ORG_ID, name: "Mirror wall installation",        amount: 35000,  date: dateOnly(daysAgo(150)), notes: "Training area upgrade" },
      { orgId: ORG_ID, name: "Sound system upgrade",           amount: 28000,  date: dateOnly(daysAgo(90)),  notes: "Bluetooth ceiling speakers" },
      { orgId: ORG_ID, name: "Functional training rig",        amount: 95000,  date: dateOnly(daysAgo(60)),  notes: "Multi-station rig for group classes" },
    ],
  });

  console.log("✓  Investments done");

  // ── 11. Daily Activity Snapshots ──────────────────────────────────────────

  console.log("📅  Seeding daily snapshots...");

  for (let daysBack = 30; daysBack >= 1; daysBack--) {
    const snapshotDate = dateOnly(daysAgo(daysBack));
    const totalMembers = members.length;
    const activeM = members.filter((m) => m.isActive).length;
    const newlyExpired = daysBack % 7 === 0 ? randInt(0, 2) : 0;

    try {
      await prisma.dailyActivitySnapshot.create({
        data: {
          orgId: ORG_ID,
          snapshotDate,
          totalMembers,
          activeMembers: activeM,
          inactiveMembers: totalMembers - activeM,
          newlyExpired,
        },
      });
    } catch (e) {
      // skip duplicate
    }
  }

  console.log("✓  Snapshots done");

  console.log("\n🎉  Seed complete!");
  console.log(`    Org:        ${ORG_ID}`);
  console.log(`    Members:    ${members.length}`);
  console.log(`    Trainers:   4 (3 active, 1 inactive)`);
  console.log(`    Plan types: 4 (2 membership, 2 training)`);
  console.log(`    Offers:     5`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
