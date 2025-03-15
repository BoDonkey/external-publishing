<template>
  <AposModal
    :modal="modal"
    :has-errors="hasErrors"
    @inactive="modal.active = false"
    @show-modal="modal.showModal = true"
    :active="modal.active"
  >
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
              <AposSelect
                v-model="selectedProvider"
                :label="'Platform'"
                :items="providerItems"
                :field="{
                  label: 'Platform',
                  type: 'select'
                }"
              />
            </div>

            <template v-if="selectedAdapter && providerOptions">
              <div class="apos-external-publish__options">
                <AposSchema
                  v-if="adapterOptions.fields"
                  :schema="adapterOptions.fields"
                  v-model="publishOptions"
                />
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>
    <template #footer>
      <div class="apos-modal__footer">
        <AposButton
          type="default"
          label="Cancel"
          @click="modal.active = false"
        />
        <AposButton
          type="primary"
          label="Publish"
          :disabled="!selectedAdapter || isPublishing || hasErrors"
          @click="publish"
        />
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
      adapters: [],
      selectedAdapter: null,
      adapterOptions: null,
      publishOptions: {},
      isPublishing: false,
      error: null,
      hasErrors: false
    };
  },
  computed: {
    docId() {
      return apos.page.page._id;
    },
    adapterItems() {
      return this.adapters.map(adapter => ({
        label: adapter.label,
        value: adapter.name
      }));
    }
  },
  watch: {
    selectedAdapter(newValue) {
      if (newValue) {
        this.fetchProviderOptions(newValue);
      } else {
        this.adapterOptions = null;
        this.publishOptions = {};
      }
    }
  },
  methods: {
    async fetchProviders() {
      try {
        const response = await apos.http.get('/api/v1/external-publishing/providers');
        this.providers = response;
      } catch (error) {
        console.error('Error fetching providers:', error);
        this.error = 'Failed to load publishing providers.';
      }
    },
    fetchAdapterOptions(providerName) {
      const adapter = this.adapters.find(a => a.name === adapterName);
      if (adapter) {
        this.adapterOptions = adapter.publishOptions;
        // Reset publish options since schema might be different
        this.publishOptions = {};
      }
    },
    async publish() {
      if (!this.selectedAdapter || this.isPublishing) {
        return;
      }

      this.isPublishing = true;
      this.error = null;

      try {
        const result = await apos.http.post('/api/v1/external-publishing/publish', {
          adapterName: this.selectedAdapter,
          docId: this.docId,
          options: this.publishOptions
        });

        apos.notify('Successfully published to ' + 
          this.adapters.find(a => a.name === this.selectedAdapter).label, { 
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
        const message = error.response?.body?.message || 'Failed to publish content.';
        apos.notify(message, { type: 'error', dismiss: true });
        this.error = message;
      } finally {
        this.isPublishing = false;
      }
    }
  },
  mounted() {
    // Register event listener for opening the modal
    apos.bus.$on('external-publish', async () => {
      await this.fetchAdapters();
      this.modal.active = true;
    });
  },
  beforeDestroy() {
    apos.bus.$off('external-publish');
  }
};
</script>