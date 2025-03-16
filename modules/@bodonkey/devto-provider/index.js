// modules/devto-provider/index.js
export default {
  extend: '@apostrophecms/module',

  init(self) {
    console.log('DEV.to provider module initialized');
    // Register with the external publishing module
    self.apos.modules['@bodonkey/external-publishing'].registerProvider('devto', {
      label: 'DEV.to',
      module: self,
      publish: self.publish,
      getPublishOptions: self.getPublishOptions
    });
  },

  methods(self) {
    return {
      getPublishOptions() {
        return {
          fields: {
            add: {
              title: {
                type: 'string',
                label: 'Title',
                required: true
              },
              tags: {
                type: 'array',
                label: 'Tags (up to 4)',
                max: 4,
                titleField: 'value',
                fields: {
                  add: {
                    value: {
                      type: 'string',
                      label: 'Tag'
                    }
                  }
                }
              },
              series: {
                type: 'string',
                label: 'Series',
                help: 'Group with other posts in a named collection'
              },
              canonical_url: {
                type: 'url',
                label: 'Canonical URL',
                help: 'Original URL if this is a cross-post'
              },
              published: {
                type: 'boolean',
                label: 'Publish immediately',
                def: false
              }
            }
          }
        };
      },

      async publish(req, doc, options) {
        try {
          const apiKey = await self.getApiKey(req);

          if (!apiKey) {
            throw new Error('DEV.to API key not configured');
          }

          // Format post for DEV.to
          const article = self.formatPostForDevTo(doc, options);

          // Send to DEV.to API
          const result = await self.sendToDevToApi(apiKey, article);

          return {
            id: result.id,
            url: result.url,
            status: options.published ? 'published' : 'draft'
          };
        } catch (error) {
          self.apos.util.error('DEV.to publishing error:', error);
          throw error;
        }
      },

      async getApiKey(req) {
        // First check module options
        if (self.options.apiKey) {
          return self.options.apiKey;
        }

        // Then try environment variable
        const envApiKey = process.env.DEVTO_API_KEY;
        if (envApiKey) {
          return envApiKey;
        }

        // Finally try settings
        try {
          const settings = await self.apos.settings.find(req).toObject();
          return settings?.devtoApiKey || null;
        } catch (e) {
          return null;
        }
      },

      formatPostForDevTo(doc, options) {
        // Convert Apostrophe content to markdown
        let bodyMarkdown = '';

        if (doc.aposArea?.content?.items) {
          for (const item of doc.aposArea.content.items) {
            if (item.type === 'apostrophe:rich-text') {
              // For a real implementation, you'd convert HTML to markdown
              bodyMarkdown += item.content || '';
            } else if (item.type === 'apostrophe:image') {
              // Add image
              const imageUrl = item.imageUrl || '';
              bodyMarkdown += `\n\n![${item.alt || ''}](${imageUrl})\n\n`;
            }
          }
        }

        // Format tags
        const tags = options.tags ? options.tags.map(tag => tag.value) : [];

        return {
          article: {
            title: options.title || doc.title,
            body_markdown: bodyMarkdown,
            published: !!options.published,
            tags: tags,
            series: options.series || undefined,
            canonical_url: options.canonical_url || undefined
          }
        };
      },

      async sendToDevToApi(apiKey, article) {
        self.apos.util.log('Sending to DEV.to API:', article);

        // For production:
        /*
        const response = await fetch('https://dev.to/api/articles', {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(article)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(`DEV.to API error: ${JSON.stringify(error)}`);
        }
        
        const result = await response.json();
        return {
          id: result.id,
          url: result.url,
          status: result.published ? 'published' : 'draft'
        };
        */

        // For testing, mock a successful response
        return {
          id: `devto-${Date.now()}`,
          url: `https://dev.to/your-username/draft/${Date.now()}`,
          status: article.article.published ? 'published' : 'draft'
        };
      }
    };
  }
};