import { mediaService } from './src/services/media.service';

async function testUpload() {
  console.log('Testing generatePresignedUrl...');
  try {
    const res = await mediaService.generatePresignedUrl('test.jpg', 'image/jpeg', 'Products');
    console.log('Success:', res);
  } catch (err: any) {
    console.error('Test failed!', err.message);
  }
}

testUpload();
