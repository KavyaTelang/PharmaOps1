import 'reflect-metadata';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { AppDataSource } from './config';
import { Company, User, VendorProfile, Product } from '../entities';

const seed = async () => {
  try {
    console.log('🌱 Starting seed...');
    await AppDataSource.initialize();

    const companyRepo = AppDataSource.getRepository(Company);
    const userRepo = AppDataSource.getRepository(User);
    const vendorProfileRepo = AppDataSource.getRepository(VendorProfile);
    const productRepo = AppDataSource.getRepository(Product);

    // Create company
    let company = await companyRepo.findOne({ where: { name: 'PharmaCorp' } });
    if (!company) {
      company = companyRepo.create({ name: 'PharmaCorp', domain: 'pharmacorp.com' });
      await companyRepo.save(company);
      console.log('✅ Company created');
    }

    // Create users
    const users = [
      { email: 'admin@pharmacorp.com', password: 'admin123', name: 'Admin User', role: 'ADMIN' },
      { email: 'qa@pharmacorp.com', password: 'qa123', name: 'Dr. Pulashya Verma', role: 'QA' },
      { email: 'auditor@pharmacorp.com', password: 'auditor123', name: 'External Inspector', role: 'AUDITOR' },
      { email: 'vendor@fastlogistics.com', password: 'vendor123', name: 'FastLogistics', role: 'VENDOR', isVendor: true },
    ];

    for (const userData of users) {
      const exists = await userRepo.findOne({ where: { email: userData.email } });
      if (!exists) {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const user = userRepo.create({
          email: userData.email,
          passwordHash,
          name: userData.name,
          role: userData.role,
          companyId: company.id,
        });
        await userRepo.save(user);
        console.log(`✅ User: ${userData.email}`);

        if (userData.isVendor) {
          const vendorProfile = vendorProfileRepo.create({
            userId: user.id,
            companyName: 'FastLogistics Inc.',
            licenseNumber: 'LIC-FL-2024',
            warehouseAddress: 'Berlin Dock 4',
            status: 'ACCEPTED',
            companyId: company.id, // ✅ ADDED THIS LINE
          });
          await vendorProfileRepo.save(vendorProfile);
          console.log('✅ Vendor profile created');
        }
      }
    }

    // Create products
    const products = [
      { name: 'Atenolol 50mg Tablets', sku: 'ATN-50-001', description: 'Beta-blocker medication' },
      { name: 'Lisinopril 10mg Tablets', sku: 'LIS-10-001', description: 'ACE inhibitor' },
      { name: 'Metformin 500mg Tablets', sku: 'MET-500-001', description: 'Diabetes medication' },
    ];

    for (const p of products) {
      const exists = await productRepo.findOne({ where: { sku: p.sku } });
      if (!exists) {
        const product = productRepo.create({ ...p, companyId: company.id });
        await productRepo.save(product);
        console.log(`✅ Product: ${p.name}`);
      }
    }

    console.log('🎉 Seed complete!');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seed();