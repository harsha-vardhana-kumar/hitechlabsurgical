import type { AdminWorkspace, AdminCommand, Session, Activity, EnquiryStatus, AdminProduct, Permission } from '@hitech/types/admin';
import { invariant, validateProduct, validateCategory, validateEnquiry, validateSettings, validatePage, validateSeo, validateMedia } from '@hitech/validation';
import { publicBusiness } from '@hitech/config/business';
import { uniqueId, slugify } from '@hitech/utils';
import { authorize, roles } from '../domain/permissions';
import { productFields, categoryFields, pageFields, mediaUsage, seoFields } from '../domain/projections';
export const enquiryTransitions: Record<EnquiryStatus, readonly EnquiryStatus[]> = {
  New:['Contacted','In Progress','Spam','Closed'], Contacted:['In Progress','Quoted','Closed','Spam'],
  'In Progress':['Contacted','Quoted','Closed','Spam'], Quoted:['In Progress','Closed'], Closed:['In Progress'], Spam:['New'],
};
export function validateTransition(from: EnquiryStatus, to: EnquiryStatus) { invariant(from===to || enquiryTransitions[from]?.includes(to), `Cannot change ${from} directly to ${to}.`); }
function current<T extends {id: string}>(items: T[], id: string) { const found=items.find(i=>i.id===id); invariant(found,'This record no longer exists.'); return found; }
function version(actual: number, expected: number) { invariant(actual === expected, 'This record changed in another tab. Reload the latest version before saving.'); }
function put<T extends {id:string}>(items: T[], item: T) { const i=items.findIndex(x=>x.id===item.id); if(i<0) items.push(item); else items[i]=item; }
function image(w: AdminWorkspace, id: string, requireAlt=false) { if(!id) return; const m=current(w.media,id); invariant(!requireAlt||!!m.alt.trim(),'Image alt text is required before publishing.'); }
function publishMedia(w:AdminWorkspace,ids:string[]){ids.filter(Boolean).forEach(id=>{const m=current(w.media,id);m.published={url:m.url,alt:m.alt,caption:m.caption,width:m.width,height:m.height};});}
function productReferences(w: AdminWorkspace,p: AdminProduct, publish=false) {
  if(p.categoryId) {const c=current(w.categories,p.categoryId); if(publish) invariant(c.active && c.published?.active,'Publish an active category before publishing this product.');}
  for(const id of [p.imageId,...p.additionalImageIds,p.seo.ogImageId]) image(w,id,publish);
  invariant(!w.products.some(x=>x.id!==p.id && (x.slug===p.slug || x.published?.slug===p.slug)),'This product slug is already reserved.');
}
function audit(w:AdminWorkspace,s:Session,action:string,entity:string,id:string,metadata:Activity['metadata']={}) {
  w.activity.unshift({id:uniqueId('activity'),actor:s.name,actorId:s.id,action,entity,entityId:id,timestamp:new Date().toISOString(),metadata});
}
function publication(w:AdminWorkspace,s:Session,entity:string,id:string,name:string,action:'Published'|'Unpublished'|'Archived') { w.publishing.unshift({id:uniqueId('release'),entity,entityId:id,name,action,actor:s.name,timestamp:new Date().toISOString(),demo:true}); }
function permission(c: AdminCommand): Permission {
  switch(c.type) {
    case 'product.save': return 'products.manage';
    case 'product.action': return ['review','duplicate'].includes(c.action)?'products.manage':'products.publish';
    case 'category.save': case 'category.delete': return 'categories.manage';
    case 'category.publish': case 'page.publish': return 'products.publish';
    case 'media.save': case 'media.delete': return 'media.manage';
    case 'enquiry.createDemo': case 'enquiry.update': return 'enquiries.manage';
    case 'page.save': return 'content.manage';
    case 'seo.save': return 'seo.manage';
    case 'settings.save': case 'settings.publish': return 'settings.manage';
    case 'user.save': return 'users.manage';
    default: throw new Error('Unsupported command.');
  }
}
/** Portable command boundary. Run inside a repository transaction. Server obtains session from verified identity. */
export function execute(w:AdminWorkspace,s:Session,c:AdminCommand): string {
  invariant(c && typeof c==='object' && typeof c.type==='string','Invalid command.');
  authorize(s,permission(c));
  const now=new Date().toISOString(); let id=''; let entity='';
  switch(c.type) {
    case 'product.save': {
      const old=w.products.find(p=>p.id===c.product.id); version(old?.revision||0,c.expectedRevision);
      const p:AdminProduct={...productFields(c.product),id:c.product.id,needsReview:c.product.needsReview,reviewNotes:c.product.reviewNotes,internalNotes:c.product.internalNotes,status:'Draft',revision:(old?.revision||0)+1,updatedAt:now,published:old?.published,publishedRevision:old?.publishedRevision};
      validateProduct(p); productReferences(w,p); put(w.products,p); id=p.id;entity='Product'; break;
    }
    case 'product.action': {
      invariant(['review','publish','unpublish','archive','duplicate'].includes(c.action),'Unsupported product action.');
      const p=current(w.products,c.id);version(p.revision,c.expectedRevision); id=p.id;entity='Product';
      if(c.action==='duplicate') {const d=structuredClone(p);d.id=uniqueId('product');d.name=`${p.name} (copy)`.slice(0,150);let n=1;d.slug=`${slugify(p.slug).slice(0,65)}-copy-${n}`;while(w.products.some(x=>x.slug===d.slug||x.published?.slug===d.slug))d.slug=`${slugify(p.slug).slice(0,65)}-copy-${++n}`;d.status='Draft';d.featured=false;d.published=undefined;d.publishedRevision=undefined;d.revision=1;d.updatedAt=now;w.products.push(d);id=d.id;break;}
      if(c.action==='publish') { validateProduct(p,true);productReferences(w,p,true);publishMedia(w,[p.imageId,...p.additionalImageIds,p.seo.ogImageId]);p.published={id:p.id,...productFields(p),publishedAt:now};p.publishedRevision=p.revision;p.status='Published';publication(w,s,entity,id,p.name,'Published'); }
      if(c.action==='review') {invariant(p.status!=='Archived','Restore this product to draft first.');p.status='Review';}
      if(c.action==='unpublish'||c.action==='archive') {invariant(c.confirmed,'Confirm removal from the published catalogue.');p.published=undefined;p.publishedRevision=undefined;p.status=c.action==='archive'?'Archived':'Draft';p.revision++;w.settings.site.homepageFeaturedIds=w.settings.site.homepageFeaturedIds.filter(x=>x!==p.id);if(w.settings.published)w.settings.published.site.homepageFeaturedIds=w.settings.published.site.homepageFeaturedIds.filter(x=>x!==p.id);publication(w,s,entity,id,p.name,c.action==='archive'?'Archived':'Unpublished');}
      p.updatedAt=now; break;
    }
    case 'category.save': {
      const old=w.categories.find(x=>x.id===c.category.id);version(old?.revision||0,c.expectedRevision);
      const v={...categoryFields(c.category),id:c.category.id,revision:(old?.revision||0)+1,updatedAt:now,published:old?.published,publishedRevision:old?.publishedRevision}; validateCategory(v);
      invariant(!w.categories.some(x=>x.id!==v.id&&(x.slug===v.slug||x.published?.slug===v.slug)),'This category slug already exists.');image(w,v.imageId);image(w,v.seo.ogImageId);
      invariant(v.active||!w.products.some(p=>p.published?.categoryId===v.id),'Reassign published products before disabling their category.');
      put(w.categories,v);id=v.id;entity='Category';break;
    }
    case 'category.publish': {
      const v=current(w.categories,c.id);version(v.revision,c.expectedRevision);validateCategory(v,true);image(w,v.imageId,true);image(w,v.seo.ogImageId,true);publishMedia(w,[v.imageId,v.seo.ogImageId]);v.published=categoryFields(v);v.publishedRevision=v.revision;id=v.id;entity='Category';publication(w,s,entity,id,v.name,'Published');break;
    }
    case 'category.delete': {
      invariant(c.confirmed,'Confirm category deletion.');const v=current(w.categories,c.id);
      const assigned=w.products.filter(p=>p.categoryId===v.id||p.published?.categoryId===v.id);
      const referenced=w.pages.some(p=>p.featuredCategoryIds.includes(v.id)||p.published?.featuredCategoryIds.includes(v.id));
      if(assigned.length||referenced) {
        invariant(c.reassignId && c.reassignId!==v.id,'Select another category to reassign all references.');
        const to=current(w.categories,c.reassignId);invariant(to.active&&to.published?.active,'The replacement category must be active and published.');
        if(assigned.some(p=>p.published?.categoryId===v.id)||referenced)authorize(s,'products.publish');
        assigned.forEach(p=>{if(p.categoryId===v.id){p.categoryId=to.id;p.revision++;p.updatedAt=now;}if(p.published?.categoryId===v.id)p.published.categoryId=to.id;});
        w.pages.forEach(p=>{if(p.featuredCategoryIds.includes(v.id)){p.featuredCategoryIds=p.featuredCategoryIds.map(x=>x===v.id?to.id:x);p.revision++;}if(p.published)p.published.featuredCategoryIds=p.published.featuredCategoryIds.map(x=>x===v.id?to.id:x);});
      }
      w.categories=w.categories.filter(x=>x.id!==v.id);id=v.id;entity='Category';break;
    }
    case 'media.save': {
      validateMedia(c.media);const old=w.media.find(x=>x.id===c.media.id);invariant(old,'Use the validated media upload adapter to create an image.');
      old.alt=c.media.alt;old.caption=c.media.caption;id=old.id;entity='Media';break;
    }
    case 'media.delete': {invariant(c.confirmed,'Confirm image deletion.');const m=current(w.media,c.id);invariant(m.source!=='bundled','Approved bundled assets cannot be deleted.');invariant(!mediaUsage(w,c.id).length,'This image is still used by draft or published content.');w.media=w.media.filter(x=>x.id!==c.id);id=c.id;entity='Media';break;}
    case 'enquiry.createDemo': {
      invariant(s.demo&&w.environment==='demo','Sample enquiries are available only in the demo workspace.');validateEnquiry(c.enquiry);
      invariant(!w.enquiries.some(e=>e.id===c.enquiry.id),'Enquiry already exists.');
      const e={...c.enquiry,status:'New' as const,assignedTo:'',internalNotes:'',submittedAt:now,revision:1,demo:true};
      if(e.productId)e.productName=current(w.products,e.productId).name;w.enquiries.unshift(e);id=e.id;entity='Enquiry';break;
    }
    case 'enquiry.update': {
      const e=current(w.enquiries,c.id);version(e.revision,c.expectedRevision);validateTransition(e.status,c.status);
      invariant(!c.assignedTo||w.users.some(u=>u.id===c.assignedTo&&u.active),'Select an active assignee.');
      const next={...e,status:c.status,assignedTo:c.assignedTo,internalNotes:c.internalNotes,revision:e.revision+1};validateEnquiry(next);put(w.enquiries,next);id=e.id;entity='Enquiry';break;
    }
    case 'page.save': {
      const old=current(w.pages,c.page.id);version(old.revision,c.expectedRevision);const p={...pageFields(c.page),id:old.id,path:old.path,revision:old.revision+1,updatedAt:now,published:old.published,publishedRevision:old.publishedRevision};validatePage(p);image(w,p.seo.ogImageId);p.featuredCategoryIds.forEach(id=>current(w.categories,id));put(w.pages,p);id=p.id;entity='Content';break;
    }
    case 'page.publish': {
      const p=current(w.pages,c.id);version(p.revision,c.expectedRevision);validatePage(p,true);image(w,p.seo.ogImageId,true);p.featuredCategoryIds.forEach(id=>invariant(current(w.categories,id).published?.active,'Publish featured categories first.'));publishMedia(w,[p.seo.ogImageId]);p.published=pageFields(p);p.publishedRevision=p.revision;id=p.id;entity='Content';publication(w,s,entity,id,p.title,'Published');break;
    }
    case 'settings.save': {version(w.settings.revision,c.expectedRevision);validateSettings(c.settings);image(w,c.settings.site.logoId);image(w,c.settings.site.faviconId);image(w,c.settings.site.defaultSeo.ogImageId);c.settings.site.homepageFeaturedIds.forEach(id=>current(w.products,id));w.settings={business:structuredClone(c.settings.business),site:structuredClone(c.settings.site),revision:w.settings.revision+1,published:w.settings.published,publishedRevision:w.settings.publishedRevision};id='settings';entity='Settings';break;}
    case 'settings.publish': {version(w.settings.revision,c.expectedRevision);validateSettings(w.settings);w.settings.site.homepageFeaturedIds.forEach(id=>invariant(current(w.products,id).published,'Publish featured products before publishing their homepage selection.'));publishMedia(w,[w.settings.site.logoId,w.settings.site.faviconId,w.settings.site.defaultSeo.ogImageId]);w.settings.published={business:publicBusiness(w.settings.business,w.settings.site.publicContacts),site:structuredClone(w.settings.site)};w.settings.publishedRevision=w.settings.revision;id='settings';entity='Settings';publication(w,s,entity,id,'Business & website settings','Published');break;}
    case 'user.save': {
      const u=c.user;invariant(s.demo&&u.demo,'Real users require the production identity provider.');
      invariant(typeof u.name==='string'&&u.name.trim()&&u.name.length<=150,'A user name is required.');invariant(!u.email||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email),'Enter a valid user email.');invariant(roles.includes(u.role),'Unknown role.');
      invariant(u.id!==s.id || (u.active&&u.role===s.role),'You cannot disable or change your own role.');
      const next=w.users.filter(x=>x.id!==u.id).concat({...u,demo:true});invariant(next.some(x=>x.active&&x.role==='Owner'),'At least one active Owner is required.');w.users=next;id=u.id;entity='User';break;
    }
    case 'seo.save': {validateSeo(c.seo);image(w,c.seo.ogImageId);invariant(c.entity==='product'||c.entity==='page','Unknown SEO entity.');const item=c.entity==='product'?current(w.products,c.id):current(w.pages,c.id);version(item.revision,c.expectedRevision);item.seo=seoFields(c.seo);item.revision++;item.updatedAt=now;id=item.id;entity='SEO';break;}
    default: throw new Error('Unsupported command.');
  }
  audit(w,s,c.type+('action' in c?`.${c.action}`:''),entity,id);return id;
}
