import bcrypt from 'bcryptjs';
import fs from 'fs';

const db = JSON.parse(fs.readFileSync('data/db.json', 'utf8'));
const alvia = db.users.find(u => u.email.includes('alvia'));
console.log('Alvia record:', alvia);

const candidates = [
  'alvia123', 'Alvia123', 'Alvia@123', 'alvia@123', 'password', 'Password123!', 
  '123456', '12345678', 'alvia1234', 'AIDS', 'Semester 3', 'alvia', 'Alvia',
  '1234567', 'password123', 'Password@123', 'Alvia12', 'Alvia#123', 'alvia'
];

for (const c of candidates) {
  if (bcrypt.compareSync(c, alvia.passwordHash)) {
    console.log('MATCH FOUND FOR ALVIA:', c);
  }
}
