import jwt from 'jsonwebtoken';

const JWT_SECRET = "distrato-justo-secret-key-2026";

async function testLoginLogic() {
    const mockUser = { id: 1, email: 'gdaigreja@gmail.com', role: 'admin' };
    
    // Simulate Login for Distrato
    const operationD = 'distrato';
    const tokenD = jwt.sign({ ...mockUser, project: operationD }, JWT_SECRET);
    const decodedD = jwt.verify(tokenD, JWT_SECRET);
    console.log("Distrato Login Decoded:", decodedD);

    // Simulate Login for Resolve
    const operationR = 'resolve';
    const tokenR = jwt.sign({ ...mockUser, project: operationR }, JWT_SECRET);
    const decodedR = jwt.verify(tokenR, JWT_SECRET);
    console.log("Resolve Login Decoded:", decodedR);
}

testLoginLogic();
