/**
 * Validator.js
 * Centralized validation logic for Zentra.
 * Enforces data models before sending to Firestore.
 */

export const Validator = {
    // Regular Expressions
    patterns: {
        slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        price: /^\d+(\.\d{1,2})?$/,
        url: /^(https?:\/\/[^\s]+)$/
    },

    // Enums
    enums: {
        listingCategories: ['model-kits', 'hardware', 'tech', 'maker-gear'],
        listingConditions: ['new', 'mint', 'excellent', 'good', 'project'],
        postTypes: ['build', 'discussion', 'showcase']
    },

    /**
     * Validate Listing Data
     * @param {Object} data 
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validateListing(data) {
        const errors = [];

        // Required Fields
        if (!data.title || data.title.trim().length === 0) errors.push("Title is required.");
        if (data.title && data.title.length > 80) errors.push("Title max length is 80 characters.");

        if (!data.price || isNaN(data.price) || data.price <= 0) errors.push("Price must be a positive number.");

        if (!data.category || !this.enums.listingCategories.includes(data.category)) {
            errors.push("Invalid category selected.");
        }

        if (!data.condition || !this.enums.listingConditions.includes(data.condition)) {
            errors.push("Invalid condition selected.");
        }

        if (!data.location || data.location.trim().length === 0) errors.push("Location is required.");

        if (data.description && data.description.length > 2000) errors.push("Description max length is 2000 characters.");

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Validate Network Post Data
     * @param {Object} data 
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    validatePost(data) {
        const errors = [];

        // Required Fields
        if (!data.title || data.title.trim().length === 0) errors.push("Title is required.");
        if (data.title && data.title.length > 100) errors.push("Title max length is 100 characters.");

        if (!data.type || !this.enums.postTypes.includes(data.type)) {
            errors.push("Invalid post type.");
        }

        if (!data.content || data.content.trim().length === 0) errors.push("Content cannot be empty.");

        // Optional Linked Slug validation
        if (data.linkedProductSlugs && data.linkedProductSlugs.length > 0) {
            data.linkedProductSlugs.forEach(slug => {
                if (!this.patterns.slug.test(slug)) {
                    errors.push(`Invalid product slug format: ${slug}`);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};
