import { Client } from 'pg';  // Using 'import' instead of 'require'
import { faker } from '@faker-js/faker';

// Create a new PostgreSQL client
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'puurga', // Your database name
  password: 'Password@123', // Your password
  port: 5432,
});

// Connect to PostgreSQL
client.connect();

// Function to insert random users
async function insertRandomUsers() {
  const users = [];
  for (let i = 0; i < 5; i++) {
    users.push({
      name: faker.name.findName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      role: 'user',
      created_at: faker.date.recent(),
      updated_at: faker.date.recent(),
    });
  }

  for (const user of users) {
    await client.query(
      'INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.name, user.email, user.password, user.role, user.created_at, user.updated_at]
    );
  }
}

// Function to insert random posts
async function insertRandomPosts() {
  for (let i = 0; i < 5; i++) {
    await client.query(
      'INSERT INTO posts (user_id, content, created_at, updated_at, likes_count, replies_count) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        faker.datatype.number({ min: 1, max: 5 }), // random user_id
        faker.lorem.sentence(),
        faker.date.recent(),
        faker.date.recent(),
        faker.datatype.number({ min: 10, max: 200 }),
        faker.datatype.number({ min: 0, max: 50 }),
      ]
    );
  }
}

// Function to insert random comments
async function insertRandomComments() {
  for (let i = 0; i < 5; i++) {
    await client.query(
      'INSERT INTO comments (post_id, user_id, content, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [
        faker.datatype.number({ min: 1, max: 5 }), // random post_id
        faker.datatype.number({ min: 1, max: 5 }), // random user_id
        faker.lorem.sentence(),
        faker.date.recent(),
        faker.date.recent(),
      ]
    );
  }
}

// Function to insert random likes
async function insertRandomLikes() {
  for (let i = 0; i < 5; i++) {
    await client.query(
      'INSERT INTO likes (post_id, user_id, created_at) VALUES ($1, $2, $3)',
      [
        faker.datatype.number({ min: 1, max: 5 }), // random post_id
        faker.datatype.number({ min: 1, max: 5 }), // random user_id
        faker.date.recent(),
      ]
    );
  }
}

// Function to insert random followers
async function insertRandomFollowers() {
  for (let i = 0; i < 5; i++) {
    await client.query(
      'INSERT INTO followers (follower_id, following_id, created_at) VALUES ($1, $2, $3)',
      [
        faker.datatype.number({ min: 1, max: 5 }), // random follower_id
        faker.datatype.number({ min: 1, max: 5 }), // random following_id
        faker.date.recent(),
      ]
    );
  }
}

// Call the functions to populate the database
async function populateDatabase() {
  try {
    await insertRandomUsers();
    await insertRandomPosts();
    await insertRandomComments();
    await insertRandomLikes();
    await insertRandomFollowers();
    console.log('Database populated with random data!');
  } catch (err) {
    console.error('Error populating database:', err);
  } finally {
    client.end(); // Close the database connection
  }
}

// Start the process
populateDatabase();
