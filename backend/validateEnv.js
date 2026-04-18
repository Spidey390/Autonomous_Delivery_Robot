const required = (value, name) => {
  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }
};

const validate = () => {
  try {
    required(process.env.PORT, 'PORT');
    required(process.env.MONGODB_URI, 'MONGODB_URI');
    required(process.env.JWT_SECRET, 'JWT_SECRET');

    if (process.env.JWT_SECRET.length < 16) {
      throw new Error('JWT_SECRET must be at least 16 characters');
    }

    const mongoPattern = /^mongodb(\+srv)?:\/\//;
    if (!mongoPattern.test(process.env.MONGODB_URI)) {
      throw new Error('MONGODB_URI must be a valid MongoDB connection string');
    }

    console.log('✅ Environment variables validated');
  } catch (err) {
    console.error('❌ Environment validation failed:', err.message);
    process.exit(1);
  }
};

validate();
