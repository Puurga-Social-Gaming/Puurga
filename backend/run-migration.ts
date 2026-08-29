import { up } from './migrations/20260829000000_baseline_schema';

up()
  .then(() => {
    console.log('Baseline migration completed successfully');
    process.exit(0);
  })
  .catch((error: any) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
