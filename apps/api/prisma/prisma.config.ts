const config = {
  schemaPath: 'apps/api/prisma/schema.prisma',
  client: {
    output: 'node_modules/.prisma/client',
  },
  generator: {
    provider: 'prisma-client-js',
  },
};

export default config;
