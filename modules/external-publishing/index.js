// modules/external-publishing/index.js
export default {
  extend: '@apostrophecms/module',
  options: {
    alias: 'externalPublishing',
    providers: {}
  },
  init(self) {
    self.providers = {};
    self.enabledProviders = [];
    
    // Register providers configured directly in options
    if (self.options.providers) {
      for (const [name, provider] of Object.entries(self.options.providers)) {
        self.registerProvider(name, provider);
      }
    }
    
    // Add right-side icon button to admin bar
    self.apos.adminBar.add({
      name: 'externalPublish',
      icon: 'external-link',
      tooltip: 'Publish Externally',
      when: 'page',
      action: 'external-publish',
      position: 'right',
      permission: 'edit'
    });
  },
  methods(self) {
    return {
      /**
       * Register a provider module as an external publishing provider
       * @param {Object} module - Provider module
       * @param {Object} options - Provider configuration options
       */
      registerProvider(name, options) {
        if (self.providers[name]) {
          self.apos.util.warn(`Provider ${name} is already registered`);
          return;
        }
        
        const provider = {
          name,
          label: options.label || name,
          module: options.module || null,
          ...options
        };
        
        // Validate provider has required methods
        if (!self.validateProvider(provider)) {
          self.apos.util.error(`Invalid provider: ${name}`);
          return;
        }
        
        self.providers[name] = provider;
        self.enabledProviders.push(name);
      },
      
      /**
       * Validate a provider has required interface
       * @param {Object} provider - Provider to validate
       * @returns {boolean} Whether provider is valid
       */
      validateProvider(provider) {
        if (!provider.publish || typeof provider.publish !== 'function') {
          self.apos.util.error(`Provider ${provider.name} missing required method: publish`);
          return false;
        }
        
        if (!provider.getPublishOptions || typeof provider.getPublishOptions !== 'function') {
          self.apos.util.error(`Provider ${provider.name} missing required method: getPublishOptions`);
          return false;
        }
        
        return true;
      },
      
      /**
       * Publish a document to an external platform
       * @param {Object} req - Request object
       * @param {string} providerName - Name of the provider
       * @param {string} docId - ID of the document to publish
       * @param {Object} options - Publishing options
       * @returns {Object} Result of publishing
       */
      async publish(req, providerName, docId, options = {}) {
        const provider = self.providers[providerName];
        
        if (!provider) {
          throw new Error(`Unknown provider: ${providerName}`);
        }
        
        // Get the document
        const doc = await self.apos.doc.find(req, { _id: docId }).toObject();
        
        if (!doc) {
          throw new Error(`Document not found: ${docId}`);
        }
        
        // Publish using the provider
        try {
          const result = await provider.publish(req, doc, options);
          
          // Store publication info in the document
          await self.recordPublication(req, doc, providerName, result);
          
          return result;
        } catch (error) {
          self.apos.util.error('Publication failed:', error);
          throw error;
        }
      },
      
      /**
       * Record publication information in the document
       * @param {Object} req - Request object
       * @param {Object} doc - The document that was published
       * @param {string} providerName - Name of the provider
       * @param {Object} result - Result from the provider's publish method
       */
      async recordPublication(req, doc, providerName, result) {
        // Create publication record
        const publication = {
          provider: providerName,
          publishedAt: new Date(),
          externalId: result.id || null,
          externalUrl: result.url || null,
          status: result.status || 'published'
        };
        
        // Update document with publication record
        await self.apos.doc.db.updateOne(
          { _id: doc._id },
          {
            $push: {
              'externalPublications': publication
            }
          }
        );
      },
      
      /**
       * Get publishing options for a provider
       * @param {string} providerName - Name of the provider
       * @returns {Object} Provider's publishing options schema
       */
      getProviderPublishOptions(providerName) {
        const provider = self.providers[providerName];
        if (!provider) {
          throw new Error(`Unknown provider: ${providerName}`);
        }
        
        return provider.getPublishOptions();
      },
      
      /**
       * Get all registered providers
       * @returns {Object} Object mapping provider names to their implementation
       */
      getProviders() {
        return self.providers;
      },
      
      /**
       * Get all enabled provider names
       * @returns {Array} Array of enabled provider names
       */
      getEnabledProviders() {
        return self.enabledProviders;
      }
    };
  },
  apiRoutes(self) {
    return {
      get: {
        // Get all available providers
        async providers(req) {
          const providers = self.getEnabledProviders().map(name => {
            const provider = self.providers[name];
            return {
              name,
              label: provider.label,
              publishOptions: provider.getPublishOptions()
            };
          });
          
          return providers;
        }
      },
      post: {
        // Publish a document to an external platform
        async publish(req) {
          const { providerName, docId, options } = req.body;
          
          if (!providerName || !docId) {
            throw self.apos.error('invalid', {
              message: 'providerName and docId are required'
            });
          }
          
          try {
            const result = await self.publish(req, providerName, docId, options);
            return result;
          } catch (error) {
            throw self.apos.error('publishing-failed', {
              message: error.message
            });
          }
        }
      }
    };
  }
};