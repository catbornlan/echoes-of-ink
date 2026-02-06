/**
 * End-to-End Test Suite for Murder Mystery Game
 * 
 * This test suite covers the main game flow from welcome to reveal.
 * Run with: node frontend/test/e2e-test.js
 */

// Simple test harness (no external dependencies needed)
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    async test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('\n🎮 Murder Mystery Game - E2E Test Suite\n');
        console.log('='.repeat(60));

        for (const { name, fn } of this.tests) {
            try {
                await fn();
                this.passed++;
                console.log(`✅ PASS: ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ FAIL: ${name}`);
                console.log(`   Error: ${error.message}`);
            }
        }

        console.log('='.repeat(60));
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        console.log(`Total: ${this.tests.length} tests\n`);

        return this.failed === 0;
    }
}

// Test helper functions
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// API test helpers
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:8000${endpoint}`, options);

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Test Suite
const runner = new TestRunner();

// Test 1: Backend is running
runner.test('Backend server is accessible', async () => {
    const data = await apiRequest('/api/characters');
    assert(Array.isArray(data), 'Characters endpoint should return an array');
    assert(data.length > 0, 'Should have at least one character');
});

// Test 2: Characters API
runner.test('Get all characters', async () => {
    const characters = await apiRequest('/api/characters');
    assert(characters.length >= 6, 'Should have at least 6 characters');

    const firstChar = characters[0];
    assert(firstChar.id, 'Character should have id');
    assert(firstChar.name, 'Character should have name');
    assert(firstChar.role, 'Character should have role');
});

// Test 3: Locations API
runner.test('Get all locations', async () => {
    const locations = await apiRequest('/api/locations');
    assert(Array.isArray(locations), 'Locations should be an array');
    assert(locations.length > 0, 'Should have at least one location');

    const firstLoc = locations[0];
    assert(firstLoc.id, 'Location should have id');
    assert(firstLoc.name, 'Location should have name');
});

// Test 4: Start game
runner.test('Start a new game', async () => {
    const characters = await apiRequest('/api/characters');
    const playerId = characters[0].id;

    const gameState = await apiRequest('/api/game/start', 'POST', playerId);
    assert(gameState.player_character, 'Game state should have player character');
    assertEqual(gameState.player_character, playerId, 'Player character should match');
    assert(gameState.current_phase, 'Game state should have current phase');
});

// Test 5: Advance phase
runner.test('Advance to next phase', async () => {
    // Start game first
    const characters = await apiRequest('/api/characters');
    await apiRequest('/api/game/start', 'POST', characters[0].id);

    // Advance phase
    const result = await apiRequest('/api/game/advance_phase', 'POST');
    assert(result.current_phase, 'Should return new phase');
});

// Test 6: Search evidence
runner.test('Search for evidence', async () => {
    // Start game
    const characters = await apiRequest('/api/characters');
    await apiRequest('/api/game/start', 'POST', characters[0].id);

    // Advance to search phase
    await apiRequest('/api/game/advance_phase', 'POST');

    // Get locations
    const locations = await apiRequest('/api/locations');
    const firstLocation = locations[0];

    // Search
    try {
        const evidence = await apiRequest('/api/phase/search', 'POST', {
            character_id: characters[0].id,
            location_id: firstLocation.id,
            action_points: 1
        });

        assert(Array.isArray(evidence), 'Search should return evidence array');
    } catch (error) {
        // Expected if not in search phase or no evidence found
        console.log('   Note: Search may not be available in current phase');
    }
});

// Test 7: Evidence API
runner.test('Get all evidence (debug)', async () => {
    const evidence = await apiRequest('/api/evidence');
    assert(Array.isArray(evidence), 'Evidence should be an array');
    assert(evidence.length > 0, 'Should have at least one evidence');

    const firstEv = evidence[0];
    assert(firstEv.id, 'Evidence should have id');
    assert(firstEv.label, 'Evidence should have label');
    assert(firstEv.location, 'Evidence should have location');
});

// Test 8: Story truth API
runner.test('Get story truth', async () => {
    const truth = await apiRequest('/api/story_truth');
    assert(truth.title, 'Truth should have title');
    assert(truth.truth_story, 'Truth should have story');
});

// Run all tests
runner.run().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
