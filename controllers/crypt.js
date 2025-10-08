import bcrypt from 'bcryptjs';

const password = "123456"; // your string
const saltRounds = 10; // higher = more secure, but slower

const hash = await bcrypt.hash(password, saltRounds);
console.log("Hash:", hash);