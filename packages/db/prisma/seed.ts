import { createClient } from "@supabase/supabase-js";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PASSWORD = "Kaptano2026!";

type SeedUser = {
  email: string;
  fullName: string;
  role: UserRole;
  tenantSlug?: string;
  companyName?: string;
};

const USERS: SeedUser[] = [
  {
    email: "platform@kaptano.test",
    fullName: "Admin Plateforme",
    role: "PLATFORM_ADMIN",
  },
  {
    email: "admin@demo.kaptano.test",
    fullName: "Marie Exposante",
    role: "EXHIBITOR_ADMIN",
    tenantSlug: "demo-exposant",
    companyName: "Demo Exposant SARL",
  },
  {
    email: "agent@demo.kaptano.test",
    fullName: "Jean Agent",
    role: "AGENT",
    tenantSlug: "demo-exposant",
  },
  {
    email: "admin@afribank.kaptano.test",
    fullName: "Paul AfriBank",
    role: "EXHIBITOR_ADMIN",
    tenantSlug: "afribank",
    companyName: "AfriBank Global",
  },
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureTenant(slug: string, name: string) {
  return prisma.tenant.upsert({
    where: { slug },
    create: { slug, name, planTier: "STARTER", subscriptionStatus: "ACTIVE" },
    update: { name },
  });
}

async function ensureAuthUser(email: string, password: string) {
  const supabase = getSupabase();
  const { data: listed } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = listed?.users?.find((u) => u.email === email);

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Supabase: ${error?.message ?? "création utilisateur échouée"} (${email})`);
  }

  return data.user.id;
}

async function ensureDbUser(params: {
  email: string;
  fullName: string;
  role: UserRole;
  supabaseUserId: string;
  tenantId?: string;
}) {
  return prisma.user.upsert({
    where: { email: params.email },
    create: {
      email: params.email,
      fullName: params.fullName,
      role: params.role,
      supabaseUserId: params.supabaseUserId,
      tenantId: params.tenantId ?? null,
    },
    update: {
      fullName: params.fullName,
      role: params.role,
      supabaseUserId: params.supabaseUserId,
      tenantId: params.tenantId ?? null,
      active: true,
    },
  });
}

async function seedDemoData(tenantId: string, agentUserId: string) {
  let event = await prisma.event.findFirst({
    where: { tenantId, name: "Foire BTP Douala 2026" },
  });
  if (!event) {
    event = await prisma.event.create({
      data: {
        tenantId,
        name: "Foire BTP Douala 2026",
        location: "Douala, Cameroun",
        startDate: new Date("2026-03-15"),
        endDate: new Date("2026-03-18"),
      },
    });
  }

  const stand = await prisma.stand.upsert({
    where: { qrToken: "demo-stand-qr-token" },
    create: {
      tenantId,
      eventId: event.id,
      name: "Stand principal",
      qrToken: "demo-stand-qr-token",
      active: true,
    },
    update: {
      name: "Stand principal",
      eventId: event.id,
      active: true,
    },
  });

  const leads = [
    {
      fullName: "Sophie Nguema",
      whatsappNumber: "+237612345678",
      email: "sophie@example.com",
      company: "BTP Plus",
      source: "QR_SELF" as const,
    },
    {
      fullName: "Marc Ondo",
      whatsappNumber: "+237698765432",
      company: "Construct Pro",
      source: "AGENT" as const,
      capturedById: agentUserId,
    },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: {
        tenantId_whatsappNumber: {
          tenantId,
          whatsappNumber: lead.whatsappNumber,
        },
      },
      create: {
        tenantId,
        standId: stand.id,
        fullName: lead.fullName,
        whatsappNumber: lead.whatsappNumber,
        email: lead.email,
        company: lead.company,
        source: lead.source,
        capturedById: lead.capturedById,
        optInConsent: true,
        consentAt: new Date(),
      },
      update: {
        standId: stand.id,
        fullName: lead.fullName,
        optInConsent: true,
      },
    });
  }

  return { event, stand, leadsCount: leads.length };
}

async function main() {
  console.log("🌱 Seed comptes de test Kaptano\n");

  const tenantBySlug = new Map<string, string>();

  for (const user of USERS) {
    if (user.tenantSlug && user.companyName) {
      const tenant = await ensureTenant(user.tenantSlug, user.companyName);
      tenantBySlug.set(user.tenantSlug, tenant.id);
    }
  }

  for (const user of USERS) {
    const supabaseUserId = await ensureAuthUser(user.email, TEST_PASSWORD);
    const tenantId = user.tenantSlug ? tenantBySlug.get(user.tenantSlug) : undefined;

    await ensureDbUser({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      supabaseUserId,
      tenantId,
    });

    console.log(`✓ ${user.role.padEnd(16)} ${user.email}`);
  }

  const demoTenantId = tenantBySlug.get("demo-exposant");
  const agent = await prisma.user.findUnique({
    where: { email: "agent@demo.kaptano.test" },
  });

  if (demoTenantId && agent) {
    const demo = await seedDemoData(demoTenantId, agent.id);
    console.log(`\n✓ Données démo : 1 événement, 1 stand, ${demo.leadsCount} leads`);
    console.log(`  QR public : http://localhost:3000/c/demo-stand-qr-token`);
  }

  console.log("\n────────────────────────────────────────");
  console.log("Mot de passe pour tous les comptes :", TEST_PASSWORD);
  console.log("────────────────────────────────────────");
  console.log("Plateforme    → platform@kaptano.test     /platform");
  console.log("Exposant demo → admin@demo.kaptano.test   /dashboard");
  console.log("Agent demo    → agent@demo.kaptano.test    /dashboard");
  console.log("Exposant 2    → admin@afribank.kaptano.test /dashboard");
  console.log("Connexion     → http://localhost:3000/login\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
