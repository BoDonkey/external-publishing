<template>
  <AposModal :modal="modal" :has-errors="hasErrors" @inactive="modal.active = false"
    @show-modal="modal.showModal = true" :active="modal.active">
    <template #header>
      <div class="apos-modal__header">
        <h2 class="apos-modal__heading">Publish to External Platform</h2>
      </div>
    </template>
    <template #main>
      <div class="apos-modal__main">
        <template v-if="providers.length === 0">
          <div class="apos-modal__notice">
            <p>No publishing providers are available. Please configure adapters in your module configuration.</p>
          </div>
        </template>
        <template v-else>
          <div class="apos-external-publish">
            <div class="apos-external-publish__adapter-select">
              <AposSelect :value=selectedProvider @input="onProviderSelect" :label="'Platform'" :choices="providerItems"
                :field="{
                  label: 'Platform',
                  type: 'select'
                }" />
            </div>

            <template v-if="selectedProvider && adapterOptions">
              <div class="apos-external-publish__options">
                <AposSchema v-if="adapterOptions.fields" :schema="adapterOptions.fields" v-model="publishOptions" />
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>
    <template #footer>
      <div class="apos-modal__footer">
        <AposButton type="default" label="Cancel" @click="modal.active = false" />
        <AposButton type="primary" label="Publish" :disabled="!selectedProvider || isPublishing || hasErrors"
          @click="publish" />
      </div>
    </template>
  </AposModal>
</template>

<script>
export default {
  data() {
    return {
      modal: {
        active: false,
        showModal: false
      },
      providers: [],
      selectedProvider: null,
      adapterOptions: null,
      publishOptions: {},
      isPublishing: false,
      error: null,
      hasErrors: false,
      canAccess: false
    };
  },
  computed: {
    docId() {
      return apos.page.page._id;
    },
    providerItems() {
      const items = [
        { label: 'Select a platform', value: null }
      ];

      this.providers.forEach(provider => {
        items.push({
          label: provider.label,
          value: provider.name
        });
      });
      console.log('providerItems', items);
      return items;
    }
  },
  methods: {
    async fetchProviders() {
      console.log('Fetching providers');
      try {
        const response = await apos.http.get('/api/v1/@bodonkey/external-publishing/providers', {});
        this.providers = response;
      } catch (error) {
        console.error('Error fetching providers:', error);
        this.error = 'Failed to load publishing providers.';
      }
    },
    async fetchProviderOptions(providerName) {
      console.log('Fetching provider options for:', providerName);

      const provider = this.providers.find(p => p.name === providerName);

      if (provider) {
        console.log('Provider found:', provider);
        this.adapterOptions = provider.publishOptions;
        this.publishOptions = {};
        this.hasErrors = false;
      } else {
        console.log('No provider found for:', providerName);
        this.adapterOptions = null;
        this.publishOptions = {};
      }
    },
    async publish() {
      if (!this.selectedProvider || this.isPublishing) {
        return;
      }

      this.isPublishing = true;
      this.error = null;

      const requestData = {
        providerName: this.selectedProvider,
        docId: this.docId,
        options: this.publishOptions
      };

      console.log('Sending request data:', requestData);


      try {
        const result = await apos.http.post('/external-publishing-api/publish', requestData);

        apos.notify('Successfully published to ' +
          this.providers.find(p => p.name === this.selectedProvider).label, {
          type: 'success',
          dismiss: true
        });

        // Provide link to view published content if available
        if (result.url) {
          apos.notify({
            type: 'success',
            dismiss: true,
            message: 'View published content',
            href: result.url,
            target: '_blank'
          });
        }

        this.modal.active = false;
      } catch (error) {
        console.error('Error publishing:', error);

        console.log('Request data that failed:', requestData);
        const message = error.response?.body?.message || 'Failed to publish content.';
        apos.notify(message, { type: 'error', dismiss: true });
        this.error = message;
      } finally {
        this.isPublishing = false;
      }
    },
    onProviderSelect(event) {
      const value = event.target ? event.target.value : event;
      const cleanValue = typeof value === 'string'
        ? value.replace(/^["'](.*)["']$/, '$1')
        : value;

      console.log('Provider selected:', { raw: value, clean: cleanValue });

      // Set the clean value
      this.selectedProvider = cleanValue;

      // Fetch options for the selected provider
      if (cleanValue) {
        this.fetchProviderOptions(cleanValue);
      } else {
        this.adapterOptions = null;
        this.publishOptions = {};
      }
    },
  },
  async mounted() {
    console.log('ExternalPublishModal mounted');
    await this.fetchProviders();
    this.modal.active = true;
  },
    beforeDestroy() {
    apos.bus.$off('contextMenu:bodonkeyExternalPublishing');
  }
}
</script>