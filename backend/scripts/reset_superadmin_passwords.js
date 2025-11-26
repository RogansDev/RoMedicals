#!/usr/bin/env node

/**
 * Script para resetear contraseñas de super admins
 * Uso: node scripts/reset_superadmin_passwords.js [email]
 * Si no se proporciona email, se listan todos los super admins
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const generateTempPassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const mainDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'romedicals_main',
  charset: 'utf8mb4'
};

async function listSuperAdmins() {
  const connection = await mysql.createConnection(mainDbConfig);
  
  try {
    const [rows] = await connection.execute(
      `SELECT id, email, firstName, lastName, companyId, createdAt, onboardingCompleted 
       FROM users 
       WHERE role = 'super_user' AND isActive = TRUE 
       ORDER BY createdAt DESC`
    );
    
    console.log('\n📋 Super Admins encontrados:\n');
    console.log('─'.repeat(100));
    console.log(
      'Email'.padEnd(35) + 
      'Nombre'.padEnd(25) + 
      'Company ID'.padEnd(37) + 
      'Creado'.padEnd(20)
    );
    console.log('─'.repeat(100));
    
    rows.forEach((admin, index) => {
      const name = `${admin.firstName} ${admin.lastName}`;
      const created = new Date(admin.createdAt).toLocaleDateString('es-ES');
      console.log(
        `${(index + 1).toString().padStart(2)}. ${admin.email.padEnd(33)}` +
        `${name.padEnd(23)}` +
        `${admin.companyId.padEnd(35)}` +
        `${created.padEnd(18)}`
      );
    });
    
    console.log('─'.repeat(100));
    console.log(`\nTotal: ${rows.length} super admin(s)\n`);
    
    return rows;
  } finally {
    await connection.end();
  }
}

async function resetPassword(email) {
  const connection = await mysql.createConnection(mainDbConfig);
  
  try {
    // Buscar el super admin por email
    const [users] = await connection.execute(
      'SELECT id, email, firstName, lastName FROM users WHERE email = ? AND role = "super_user" AND isActive = TRUE',
      [email]
    );
    
    if (users.length === 0) {
      console.error(`\n❌ No se encontró un super admin con el email: ${email}\n`);
      return;
    }
    
    const admin = users[0];
    const newPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Actualizar contraseña
    await connection.execute(
      'UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?',
      [hashedPassword, admin.id]
    );
    
    console.log('\n✅ Contraseña reseteada exitosamente\n');
    console.log('─'.repeat(80));
    console.log('📧 Email:', admin.email);
    console.log('👤 Nombre:', `${admin.firstName} ${admin.lastName}`);
    console.log('🔑 Nueva contraseña:', newPassword);
    console.log('─'.repeat(80));
    console.log('\n⚠️  IMPORTANTE: Guarda esta contraseña de forma segura. No se puede recuperar.\n');
    
  } finally {
    await connection.end();
  }
}

async function resetAllPasswords() {
  const connection = await mysql.createConnection(mainDbConfig);
  
  try {
    const [admins] = await connection.execute(
      'SELECT id, email, firstName, lastName FROM users WHERE role = "super_user" AND isActive = TRUE'
    );
    
    if (admins.length === 0) {
      console.log('\n❌ No se encontraron super admins\n');
      return;
    }
    
    console.log(`\n🔄 Reseteando contraseñas para ${admins.length} super admin(s)...\n`);
    console.log('─'.repeat(100));
    
    const passwords = [];
    
    for (const admin of admins) {
      const newPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      await connection.execute(
        'UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?',
        [hashedPassword, admin.id]
      );
      
      passwords.push({
        email: admin.email,
        name: `${admin.firstName} ${admin.lastName}`,
        password: newPassword
      });
    }
    
    console.log('\n✅ Todas las contraseñas han sido reseteadas\n');
    console.log('─'.repeat(100));
    console.log('📋 NUEVAS CONTRASEÑAS:\n');
    
    passwords.forEach((p, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${p.email}`);
      console.log(`   Nombre: ${p.name}`);
      console.log(`   Contraseña: ${p.password}\n`);
    });
    
    console.log('─'.repeat(100));
    console.log('\n⚠️  IMPORTANTE: Guarda estas contraseñas de forma segura. No se pueden recuperar.\n');
    
  } finally {
    await connection.end();
  }
}

// Ejecutar script
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === '--all' || command === '-a') {
      await resetAllPasswords();
    } else if (command && !command.startsWith('-')) {
      // Si se proporciona un email, resetear esa contraseña
      await resetPassword(command);
    } else {
      // Por defecto, listar todos los super admins
      await listSuperAdmins();
      console.log('💡 Para resetear una contraseña, usa:');
      console.log('   node scripts/reset_superadmin_passwords.js <email>');
      console.log('\n💡 Para resetear todas las contraseñas, usa:');
      console.log('   node scripts/reset_superadmin_passwords.js --all\n');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();

