const request = require('supertest');
const express = require('express');

// --- 1. Mock Dependencies ---

// Mock the Mongoose User Model
const mockUserFindOne = jest.fn();

// Mock the User model structure to support .findOne() and return values
jest.mock('../../models/User', () => ({
    findOne: mockUserFindOne,
    // Add other mocks if needed (e.g., findOneAndUpdate)
}));

// Mock the requireAuth middleware to skip Firebase and always inject a user
jest.mock('../../middleware/requireAuth', () => (req, res, next) => {
    // Inject a fake user payload into the request object
    req.user = { uid: 'test-user-123' }; 
    next();
});

// Load the router after dependencies are mocked
const usersRouter = require('../users');

// --- 2. Setup Express App for Testing ---

const app = express();
// The router needs to handle JSON bodies if you were testing POST requests
app.use(express.json());
// Mount the router at the path it would use in server.js
app.use('/users', usersRouter);

// --- 3. Test Suite ---

describe('GET /users/status', () => {

    test('should return profileCompleted: true when user profile is completed', async () => {
        // Set up the mock response for User.findOne()
        mockUserFindOne.mockResolvedValueOnce({ 
            uid: 'test-user-123',
            profileCompleted: true 
        });

        // Use supertest to make a mock request
        const response = await request(app)
            .get('/users/status')
            .set('Authorization', 'Bearer dummy-token') // Header is required by middleware, but mocked
            .expect(200); // Expect a 200 OK status

        // 1. Verify the database function was called correctly
        expect(mockUserFindOne).toHaveBeenCalledWith({ uid: 'test-user-123' });

        // 2. Verify the response body is correct
        expect(response.body).toEqual({
            profileCompleted: true,
        });
    });

    test('should return profileCompleted: false when user profile is incomplete or not found', async () => {
        // Set up the mock to return an incomplete user object
        mockUserFindOne.mockResolvedValueOnce({ 
            uid: 'test-user-123',
            profileCompleted: false 
        });

        const response = await request(app)
            .get('/users/status')
            .expect(200);

        // 1. Verify the database function was called correctly
        expect(mockUserFindOne).toHaveBeenCalledWith({ uid: 'test-user-123' });

        // 2. Verify the response body is correct
        expect(response.body).toEqual({
            profileCompleted: false,
        });
    });
});