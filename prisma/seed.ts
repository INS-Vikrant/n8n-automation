import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123456', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@socialmedia.ai' },
    update: {},
    create: {
      email: 'demo@socialmedia.ai',
      name: 'Demo User',
      password: hashedPassword,
      provider: 'credentials',
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Create sample posts
  const samplePosts = [
    {
      userId: demoUser.id,
      content: '🚀 Just launched our new AI-powered content generator! Create engaging social media posts in seconds. #AI #ContentCreation #SocialMedia',
      platform: 'twitter',
      hashtags: ['AI', 'ContentCreation', 'SocialMedia'],
      status: 'published',
      publishedAt: new Date(),
    },
    {
      userId: demoUser.id,
      content: 'Excited to share our latest product update! We\'ve integrated n8n automation for seamless workflow management. #Automation #n8n #Productivity',
      platform: 'linkedin',
      hashtags: ['Automation', 'n8n', 'Productivity'],
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      userId: demoUser.id,
      content: '✨ Behind the scenes of our content creation process. Leveraging AI to craft perfect messages every time! #BehindTheScenes #AI #Marketing',
      platform: 'instagram',
      hashtags: ['BehindTheScenes', 'AI', 'Marketing'],
      status: 'draft',
    },
  ];

  for (const post of samplePosts) {
    await prisma.post.create({ data: post });
  }

  console.log('✅ Created sample posts');

  // Create analytics data
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    await prisma.analyticsDay.create({
      data: {
        userId: demoUser.id,
        date,
        postsGenerated: Math.floor(Math.random() * 20) + 5,
        successRate: 0.85 + Math.random() * 0.15,
        totalExecutions: Math.floor(Math.random() * 30) + 10,
        failedExecutions: Math.floor(Math.random() * 3),
        avgResponseTime: 1.2 + Math.random() * 2,
        platformBreakdown: {
          twitter: Math.floor(Math.random() * 10) + 5,
          linkedin: Math.floor(Math.random() * 8) + 3,
          instagram: Math.floor(Math.random() * 7) + 2,
          facebook: Math.floor(Math.random() * 5) + 1,
        },
      },
    });
  }

  console.log('✅ Created analytics data');
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Demo credentials:');
  console.log('   Email: demo@socialmedia.ai');
  console.log('   Password: demo123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
