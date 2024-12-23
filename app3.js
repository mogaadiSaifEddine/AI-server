const http = require('http');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const apiKey = 'AIzaSyDzi_lIeDAJVY1lgYvtg7p3nNrFMJ1pYyo'; // Replace with your API Key
const searchEngineId = '95cfb7a2272e742ba'; // Replace with your Search Engine ID (CX)

class IntelligentLocationLearner {
    constructor(learningDirectory = './learned_content') {
        this.brain = {
            knowledge: {},
            relationships: {},
            generationRules: {},
            contextualMemory: {}
        };
        this.learningDirectory = learningDirectory;

        if (!fs.existsSync(this.learningDirectory)) {
            fs.mkdirSync(this.learningDirectory, { recursive: true });
        }

        this.loadBrain();
    }

    loadBrain() {
        try {
            const brainFiles = fs.readdirSync(this.learningDirectory).filter(file => file.endsWith('.json'));

            brainFiles.forEach(file => {
                const filePath = path.join(this.learningDirectory, file);
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    this.digestKnowledge(content);
                } catch (error) {
                    console.error(`Error processing brain file ${file}:`, error);
                }
            });
        } catch (error) {
            console.error('Brain loading error:', error);
        }
    }
    digestKnowledge(content) {
        // Merges the loaded content into the brain's knowledge
        if (content.knowledge) {
            this.brain.knowledge = { ...this.brain.knowledge, ...content.knowledge };
        }
        if (content.relationships) {
            this.brain.relationships = { ...this.brain.relationships, ...content.relationships };
        }
        if (content.generationRules) {
            this.brain.generationRules = { ...this.brain.generationRules, ...content.generationRules };
        }
        if (content.contextualMemory) {
            this.brain.contextualMemory = { ...this.brain.contextualMemory, ...content.contextualMemory };
        }
    }
    async webSearch(query, location = '') {

        try {
            const searchQuery = location ? `${query} near ${location}` : query;
            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: apiKey,
                    cx: searchEngineId,
                    q: searchQuery
                }
            });

            const results = response.data.items.slice(0, 5).map(item => ({
                title: item.title,
                link: item.link,
                snippet: item.snippet
            }));

            return results;
        } catch (error) {
            console.error('Google search error:', error);
            return ['Error performing Google search'];
        }
    }


    async fetchWebSearchResults(query) {
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${apiKey}&cx=${searchEngineId}`;

        try {
            const response = await axios.get(url);
            const results = response.data.items;
            return results ? results.map(item => item.snippet).join(' ') : '';
        } catch (error) {
            console.error('Error fetching web search results:', error);
            return '';
        }
    }

    // Generate Title based on prompt and location
    async generateTitle(promptWords, location) {
        // Ensure promptWords is an array
        if (!Array.isArray(promptWords)) {
            promptWords = promptWords.split(' '); // Convert to array if it's a string
        }

        const formattedPrompt = promptWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const randomAdjectives = ['Captivating', 'Enthralling', 'Exciting', 'Fascinating', 'Immersive'];
        const adjective = randomAdjectives[Math.floor(Math.random() * randomAdjectives.length)];

        // Fetch relevant search results
        const webResults = await this.fetchWebSearchResults(formattedPrompt);
        const webSnippet = webResults ? ` - Discover more: ${webResults}` : '';

        if (promptWords.includes('treasure') || promptWords.includes('hunt')) {
            let title = `${adjective} Treasure Hunt: ${formattedPrompt}`;
            if (location) {
                title += ` in ${location}`;
            }
            return title + webSnippet;
        } else {
            let title = `${adjective} Audio Guide: ${formattedPrompt}`;
            if (location) {
                title += ` of ${location}`;
            }
            return title + webSnippet;
        }
    }

    // Generate Description based on prompt and location
    async generateDescription(promptWords, location) {
        // Ensure promptWords is an array
        if (!Array.isArray(promptWords)) {
            promptWords = promptWords.split(' '); // Convert to array if it's a string
        }

        const baseDescription = promptWords.join(' ');
        const randomPhrases = [
            'Embark on a journey to discover hidden gems.',
            'Unveil the stories behind the scenes.',
            'Dive deep into an unforgettable adventure.',
            'Explore like never before.',
            'Unlock the secrets waiting to be found.'
        ];
        const phrase = randomPhrases[Math.floor(Math.random() * randomPhrases.length)];

        // Fetch relevant search results
        const webResults = await this.fetchWebSearchResults(baseDescription);
        const webSnippet = webResults ? ` Explore further: ${webResults}` : '';

        if (promptWords.includes('treasure') || promptWords.includes('hunt')) {
            let description = `Get ready for an adventurous treasure hunt! ${phrase}`;
            if (location) {
                description += ` This experience awaits you in ${location}.`;
            }
            description += ' Follow the clues, solve the puzzles, and claim your reward!';
            return description + webSnippet;
        } else {
            let description = `Discover the rich history and culture through this immersive audio guide. ${phrase}`;
            if (location) {
                description += ` Explore the wonders of ${location}.`;
            }
            description += ' Let the narration lead you through a captivating experience.';
            return description + webSnippet;
        }
    }

    // Generate Content Object (with title and description)
    async generateContent(promptWords, location) {
        const title = await this.generateTitle(promptWords, location);
        const description = await this.generateDescription(promptWords, location);
        console.log('Generated Content:', { title, description });

        // Return the content object with title and description populated
        return {
            content: {
                title: {
                    en: title // Title in English (can expand to other languages)
                },
                description: {
                    en: description // Description in English (can expand to other languages)
                }
            }
        };
    }

    updateContextualMemory(prompt, generatedContent) {
        const timestamp = Date.now();
        this.brain.contextualMemory[prompt] = {
            content: generatedContent,
            timestamp: timestamp
        };
        this.cleanContextualMemory();
    }

    cleanContextualMemory(maxAge = 30 * 24 * 60 * 60 * 1000) {
        const now = Date.now();
        Object.keys(this.brain.contextualMemory).forEach(key => {
            if (now - this.brain.contextualMemory[key].timestamp > maxAge) {
                delete this.brain.contextualMemory[key];
            }
        });
    }

    saveBrainState() {
        const filename = `brain-${Date.now()}.json`;
        const filepath = path.join(this.learningDirectory, filename);
        fs.writeFileSync(filepath, JSON.stringify(this.brain, null, 2));
        return filepath;
    }
}

// Initialize the learner
const learner = new IntelligentLocationLearner();

// Create HTTP server
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', async () => {
        try {
            const { prompt, location } = JSON.parse(body);
            if (!prompt) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Prompt is required' }));
                return;
            }

            // Perform web search and generate content
            const searchResults = await learner.webSearch(prompt, location);
            const generatedContent = await learner.generateContent(prompt, location);
            console.log('Generated Content:', generatedContent);

            const brainStatePath = learner.saveBrainState();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                message: 'Location-based content generation successful',
                content: generatedContent,
                searchResults: searchResults,
                brainStatePath: brainStatePath
            }));

        } catch (error) {
            console.error(error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error', details: error.message }));
        }
    });
});

const PORT = 3002;
server.listen(PORT, () => {
    console.log(`Locatify Content Generator running on http://localhost:${PORT}`);
});
