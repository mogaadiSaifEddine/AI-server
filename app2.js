const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

class IntelligentLearner {
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
            const brainFiles = fs.readdirSync(this.learningDirectory)
                .filter(file => file.endsWith('.json'));

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
        const texts = [content.title?.en, content.description?.en].filter(Boolean);

        texts.forEach(text => {
            const words = text.toLowerCase().split(/\s+/);
            words.forEach((word, index) => {
                this.brain.knowledge[word] = (this.brain.knowledge[word] || 0) + 1;

                if (index > 0) {
                    const prevWord = words[index - 1];
                    if (!this.brain.relationships[prevWord]) {
                        this.brain.relationships[prevWord] = {};
                    }
                    this.brain.relationships[prevWord][word] = (this.brain.relationships[prevWord][word] || 0) + 1;
                }
            });
        });
    }

    async webSearch(query) {
        const apiKey = 'AIzaSyDzi_lIeDAJVY1lgYvtg7p3nNrFMJ1pYyo'; // Replace with your API Key
        const searchEngineId = '95cfb7a2272e742ba'; // Replace with your Search Engine ID (CX)

        try {
            const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                params: {
                    key: apiKey,
                    cx: searchEngineId,
                    q: query
                }
            });

            // Extract top 5 search results
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


    generateLocatifyContent(prompt) {
        const promptWords = prompt.toLowerCase().split(/\s+/);
        const title = this.generateTitle(promptWords);
        const description = this.generateDescription(promptWords);

        return {
            id: crypto.randomUUID(),
            alias: title.toLowerCase().replace(/\s+/g, '-'),
            title,
            description,
            challenges: [],
            content: {
                text: description,
                audio_url: '',
                image_url: ''
            }
        };
    }

    generateTitle(promptWords) {
        return promptWords.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Exploration';
    }

    generateDescription(promptWords) {
        return `A detailed exploration of ${promptWords.join(' ')}.`;
    }

    saveBrainState() {
        const filename = `brain-${Date.now()}.json`;
        const filepath = path.join(this.learningDirectory, filename);
        fs.writeFileSync(filepath, JSON.stringify(this.brain, null, 2));
        return filepath;
    }
}

const learner = new IntelligentLearner();

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { prompt, search } = JSON.parse(body);

                if (!prompt) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Prompt is required' }));
                    return;
                }

                let content = learner.generateLocatifyContent(prompt);

                if (search) {
                    content.webSearchResults = await learner.webSearch(prompt);
                }

                learner.saveBrainState();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Content generated', content }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal Server Error', details: error.message }));
            }
        });
    } else {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }
});

server.listen(3001, () => console.log('Server running on http://localhost:3000'));
