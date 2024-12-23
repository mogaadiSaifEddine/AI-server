const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class IntelligentLearner {
    constructor(learningDirectory = './learned_content') {
        this.brain = {
            knowledge: {},
            relationships: {},
            generationRules: {},
            contextualMemory: {}
        };
        this.learningDirectory = learningDirectory;

        // Ensure brain directory exists
        if (!fs.existsSync(this.learningDirectory)) {
            fs.mkdirSync(this.learningDirectory, { recursive: true });
        }

        // Load existing brain
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
        const extractText = (obj) => {
            if (typeof obj === 'string') return obj;
            if (obj && obj.en) return obj.en;
            return '';
        };

        // Extract meaningful content
        const texts = [
            extractText(content.title),
            extractText(content.description),
            extractText(content.prompt)
        ].filter(Boolean);

        texts.forEach(text => {
            // Tokenize and analyze
            const words = text.toLowerCase().split(/\s+/);

            // Build knowledge graph
            words.forEach((word, index) => {
                // Track word occurrences
                this.brain.knowledge[word] =
                    (this.brain.knowledge[word] || 0) + 1;

                // Build word relationships
                if (index > 0) {
                    const prevWord = words[index - 1];
                    if (!this.brain.relationships[prevWord]) {
                        this.brain.relationships[prevWord] = {};
                    }
                    this.brain.relationships[prevWord][word] =
                        (this.brain.relationships[prevWord][word] || 0) + 1;
                }
            });

            // Extract generation rules
            this.extractGenerationRules(words);
        });
    }

    extractGenerationRules(words) {
        // Advanced pattern recognition
        for (let i = 0; i < words.length - 2; i++) {
            const pattern = words.slice(i, i + 3).join(' ');
            this.brain.generationRules[pattern] =
                (this.brain.generationRules[pattern] || 0) + 1;
        }
    }

    generateContent(prompt) {
        const promptWords = prompt.toLowerCase().split(/\s+/);

        // Title generation with contextual learning
        const title = this.generateTitle(promptWords);

        // Description generation with relationship-based expansion
        const description = this.generateDescription(promptWords);

        // Save to contextual memory
        this.updateContextualMemory(prompt, { title, description });

        return {
            title: { 'en': title },
            description: { 'en': description }
        };
    }

    generateTitle(promptWords) {
        // Use learned relationships to create title
        let title = promptWords.map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        // Enhance with learned patterns
        const mostFrequentPatterns = Object.entries(this.brain.generationRules)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (mostFrequentPatterns.length) {
            title += ` (${mostFrequentPatterns[0][0]})`;
        }

        return title + ' Exploration';
    }

    generateDescription(promptWords) {
        // Build description using relationship chains
        let description = `A comprehensive exploration of ${promptWords.join(' ')}.`;

        // Expand description using learned relationships
        promptWords.forEach(word => {
            if (this.brain.relationships[word]) {
                const relatedWords = Object.entries(this.brain.relationships[word])
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([w]) => w);

                if (relatedWords.length) {
                    description += ` Closely connected concepts include: ${relatedWords.join(', ')}.`;
                }
            }
        });

        return description;
    }

    updateContextualMemory(prompt, generatedContent) {
        const timestamp = Date.now();

        // Store generated content with timestamp
        this.brain.contextualMemory[prompt] = {
            content: generatedContent,
            timestamp: timestamp
        };

        // Periodically clean old memories
        this.cleanContextualMemory();
    }

    cleanContextualMemory(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
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

// Initialize intelligent learner
const intelligentLearner = new IntelligentLearner();

// Create server
const server = http.createServer((req, res) => {
    // CORS and method handling
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

    req.on('end', () => {
        try {
            const { prompt } = JSON.parse(body);

            if (!prompt) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Prompt is required' }));
                return;
            }

            // Generate content using intelligent learning
            const generatedContent = intelligentLearner.generateContent(prompt);

            // Save brain state periodically
            const brainStatePath = intelligentLearner.saveBrainState();

            // Respond to client
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                message: 'Intelligent content generation',
                content: generatedContent,
                brainStatePath: brainStatePath
            }));

        } catch (error) {
            console.error(error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                details: error.message
            }));
        }
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Intelligent Learning Content Generator running on http://localhost:${PORT}`);
});