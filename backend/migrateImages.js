require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { uploadToCloudinary } = require('./src/utils/cloudinary');
const Issue = require('./src/models/Issue');
const Verification = require('./src/models/Verification');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    if (!process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name') {
      console.error('ERROR: Cloudinary is not configured properly in .env');
      process.exit(1);
    }

    const issues = await Issue.find({});
    console.log(`Found ${issues.length} issues to check.`);

    for (const issue of issues) {
      let updated = false;

      // Migrate imageUrl
      if (issue.imageUrl && issue.imageUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, issue.imageUrl);
        if (fs.existsSync(localPath)) {
          console.log(`Uploading ${localPath}...`);
          try {
            const secureUrl = await uploadToCloudinary(localPath);
            issue.imageUrl = secureUrl;
            updated = true;
          } catch (err) {
            console.error(`Failed to upload ${localPath}`, err);
          }
        } else {
          console.log(`File not found locally: ${localPath}`);
        }
      }

      // Migrate afterImageUrl
      if (issue.afterImageUrl && issue.afterImageUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, issue.afterImageUrl);
        if (fs.existsSync(localPath)) {
          console.log(`Uploading ${localPath}...`);
          try {
            const secureUrl = await uploadToCloudinary(localPath);
            issue.afterImageUrl = secureUrl;
            updated = true;
          } catch (err) {
            console.error(`Failed to upload ${localPath}`, err);
          }
        } else {
          console.log(`File not found locally: ${localPath}`);
        }
      }

      // Migrate nested verifications
      if (issue.verifications && issue.verifications.length > 0) {
        for (let i = 0; i < issue.verifications.length; i++) {
          const v = issue.verifications[i];
          if (v.imageUrl && v.imageUrl.startsWith('/uploads/')) {
            const localPath = path.join(__dirname, v.imageUrl);
            if (fs.existsSync(localPath)) {
              console.log(`Uploading nested verification ${localPath}...`);
              try {
                const secureUrl = await uploadToCloudinary(localPath);
                issue.verifications[i].imageUrl = secureUrl;
                updated = true;
              } catch (err) {
                console.error(`Failed to upload ${localPath}`, err);
              }
            } else {
              console.log(`File not found locally: ${localPath}`);
            }
          }
        }
      }

      if (updated) {
        await issue.save({ validateModifiedOnly: true });
        console.log(`Updated issue ${issue._id} in DB.`);
      }
    }

    const verifications = await Verification.find({});
    console.log(`Found ${verifications.length} verifications to check.`);

    for (const verif of verifications) {
      if (verif.imageUrl && verif.imageUrl.startsWith('/uploads/')) {
        const localPath = path.join(__dirname, verif.imageUrl);
        if (fs.existsSync(localPath)) {
          console.log(`Uploading ${localPath}...`);
          try {
            const secureUrl = await uploadToCloudinary(localPath);
            verif.imageUrl = secureUrl;
            await verif.save({ validateModifiedOnly: true });
            console.log(`Updated verification ${verif._id} in DB.`);
          } catch (err) {
            console.error(`Failed to upload ${localPath}`, err);
          }
        }
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
