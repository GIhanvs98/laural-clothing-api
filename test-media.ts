import { mediaService } from './src/services/media.service';

async function testMedia() {
  console.log('Testing Get Media Files...');
  try {
    const files = await mediaService.getMediaFiles();
    console.log('Files:', files);
  } catch (err: any) {
    console.error('Test failed!', err.message);
  }
}

testMedia();
