import assert from 'node:assert/strict';
import test from 'node:test';
import { products } from '../apps/website/src/data/products';
import { categories } from '../apps/website/src/data/categories';
import { filterProducts, getProduct, getRelatedProducts } from '../apps/website/src/services/catalog';
import { validateQuote, emptyQuote } from '../apps/website/src/lib/quote';
import { enquiryTransport } from '../apps/website/src/services/enquiries';

test('all 55 client entries have unique routes and valid categories', () => {
  assert.equal(products.length, 55);
  assert.equal(new Set(products.map(product => product.slug)).size, 55);
  assert.equal(new Set(products.map(product => product.id)).size, 55);
  for (const product of products) {
    assert.match(product.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(categories.some(category => category.id === product.category));
    assert.equal(product.specifications.length,0,'No unconfirmed technical specifications');
    assert.equal(product.packSize,undefined,'No fabricated pack sizes');
  }
});
test('uncertain source names and units stay flagged, without silent correction', () => {
  assert.equal(getProduct('k2-clotting-containers')?.name,'K2 Clotting Containers');
  for (const slug of ['k2-clotting-containers','pipettes','fixed-pipettes','urine-strips','mp','pro-bnp','erba-wash']) {
    assert.equal(getProduct(slug)?.needsReview,true);
    assert.ok(getProduct(slug)?.reviewNotes);
  }
});
test('search combines case-insensitive terms with categories, and handles empty results', () => {
  assert.equal(filterProducts(products,' ERBA h360 ','hematology').length,3);
  assert.equal(filterProducts(products,'glucose','hematology').length,0);
  assert.equal(filterProducts(products,'not-a-product','all').length,0);
  assert.equal(filterProducts(products,'','all').length,55);
  assert.equal(filterProducts(products,'AST','all')[0]?.slug,'sgot');
});
test('related products exclude the current item and remain in its category', () => {
  const product = getProduct('glucose')!;
  for (const related of getRelatedProducts(product)) {
    assert.notEqual(related.id,product.id);
    assert.equal(related.category,product.category);
  }
});
const valid = {...emptyQuote,fullName:'Demo Buyer',organisation:'Example Laboratory',phone:'+91 90000 00000',email:'buyer@example.com',city:'Demo City',product:'Pipettes',quantity:'10 units'};
test('enquiry validation rejects missing fields, bad email, bad phone and nonpositive quantity', () => {
  assert.equal(Object.keys(validateQuote(emptyQuote)).length,7);
  assert.deepEqual(validateQuote(valid),{});
  assert.ok(validateQuote({...valid,email:'invalid'}).email);
  assert.ok(validateQuote({...valid,phone:'abc1234'}).phone);
  assert.ok(validateQuote({...valid,quantity:'0'}).quantity);
  assert.ok(validateQuote({...valid,quantity:'-5'}).quantity);
  assert.ok(validateQuote({...valid,message:'x'.repeat(2001)}).message);
});
test('preview transport produces an explicit unsent draft and rejects invalid input', async () => {
  const result = await enquiryTransport.submit(valid);
  assert.equal(result.status,'preview');
  if (result.status === 'preview') {
    assert.match(result.summary,/has not been sent/);
    assert.match(result.summary,/Product \/ category: Pipettes/);
  }
  await assert.rejects(enquiryTransport.submit(emptyQuote));
});
