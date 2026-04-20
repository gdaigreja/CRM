// @ts-ignore
import app from '../server.js'; // Use .js extension since server.ts is likely compiled or using esm
import request from 'supertest';

async function testLogin() {
  console.log("Testing Distrato Login...");
  const resD = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'gdaigreja@gmail.com',
      password: '123', // I don't know the real password, but login logic is shared
      operation: 'distrato'
    });
  console.log("Distrato Response Status:", resD.status);
  console.log("Distrato Body:", resD.body);

  console.log("\nTesting Resolve Login...");
  const resR = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'gdaigreja@gmail.com',
      password: '123',
      operation: 'resolve'
    });
  console.log("Resolve Response Status:", resR.status);
  console.log("Resolve Body:", resR.body);
}

testLogin();
