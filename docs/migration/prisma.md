cd Backend
npm install mysql2 cloudinary dotenv
npm install -D ts-node @types/node
npx prisma generate
npx prisma db push
npx ts-node scripts/migrate-products.ts
