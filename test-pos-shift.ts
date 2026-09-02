import { posService } from './src/services/pos.service';
import prisma from './src/config/prisma';

async function testOpenSession() {
  console.log('Testing POS Shift Open...');
  try {
    const session = await posService.openSession({
      branchId: 'BR-TEST-001',
      terminalId: 'TERM-TEST-001',
      userId: 'USER-TEST-001',
      openingFloat: 5000,
    });
    console.log('Success! Created session:', session.id);

    // Test get current session
    console.log('Testing getCurrentSession...');
    const current = await posService.getCurrentSession('TERM-TEST-001');
    console.log('Current Session:', current ? current.id : 'null');

    // Test close session
    console.log('Testing POS Shift Close...');
    const closed = await posService.closeSession({
      sessionId: session.id,
      actualClosing: 5500
    });
    console.log('Successfully closed session:', closed.id, 'Status:', closed.status);

    // Clean up
    console.log('Cleaning up...');
    await prisma.posSession.delete({ where: { id: session.id } });
    await prisma.posTerminal.delete({ where: { id: 'TERM-TEST-001' } });
    await prisma.branch.delete({ where: { code: 'BR-TEST-001' } });
    await prisma.user.delete({ where: { id: 'USER-TEST-001' } });
    console.log('Cleanup complete.');

  } catch (err: any) {
    console.error('Test failed!', err.message);
    process.exit(1);
  }
}

testOpenSession();
