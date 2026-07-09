const SeoGenerator = require('./src/utils/seo-generator');

try {
    console.log("Testing Article Schema...");
    const article = SeoGenerator.generateArticleSchema({
        title: "Test Title",
        image: "/path/to/image.jpg",
        date: new Date().toISOString(),
        source: "Test Source",
        original_link: "https://example.com"
    });
    console.log("Article Schema:", article);

    console.log("Testing Product Schema...");
    const product = SeoGenerator.generateProductSchema({
        name: "Test Product",
        image: "/path/to/product.jpg",
        description: "Test Description",
        id: "12345",
        brand: "Test Brand",
        url: "/test-url",
        price: "99.99",
        currency: "EUR",
        in_stock: true
    });
    console.log("Product Schema:", product);

    console.log("Testing Breadcrumbs...");
    const crumbs = SeoGenerator.generateBreadcrumbs([
        { name: "Home", url: "/" },
        { name: "Product", url: "/product" }
    ]);
    console.log("Breadcrumbs:", crumbs);

    console.log("ALL TESTS PASSED");
} catch (e) {
    console.error("TEST FAILED:", e);
}
