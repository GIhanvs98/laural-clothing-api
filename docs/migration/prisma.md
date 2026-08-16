#Old Database Location

backend/databaseOLD/

lauralclothing_wp605.sql
lauralclothing_wp941.sql
wc-product-export-9-8-2026-1786290310470.csv

cd Backend
npm install mysql2 cloudinary dotenv
npm install -D ts-node @types/node
npx prisma generate
npx prisma db push
npx ts-node scripts/migrate-products.ts
