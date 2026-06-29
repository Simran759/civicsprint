class AIProvider {
  /**
   * Initialize the provider
   */
  constructor(name) {
    this.name = name;
  }

  /**
   * Generate content from a text prompt.
   * @param {string} prompt 
   * @param {Object} options 
   * @returns {Promise<any>}
   */
  async generateContent(prompt, options = {}) {
    throw new Error('Method not implemented.');
  }

  /**
   * Generate content from text + image
   * @param {string} prompt 
   * @param {string} imagePath 
   * @param {string} mimeType 
   * @param {Object} options 
   * @returns {Promise<any>}
   */
  async generateVisionContent(prompt, imagePath, mimeType, options = {}) {
    throw new Error('Method not implemented.');
  }
}

module.exports = AIProvider;
