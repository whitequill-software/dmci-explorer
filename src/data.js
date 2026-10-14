export const properties = [
 {name:'Erin Heights',location:'Quezon City',description:'A resort-inspired community set among elevated, leafy grounds — designed for growing families.'},
 {name:'The Oriana',location:'Quezon City',description:'Mediterranean-inspired living with generous open spaces and family-sized amenities.'},
 {name:'The Calinea',location:'Quezon City',description:'A low-density, boutique residence focused on comfort, privacy, and natural light.'},
 {name:'One Delta Terraces',location:null,description:'Official project information, location, and specifications are awaiting verification.'},
 {name:'The Cameron',location:null,description:'Official project information, location, and specifications are awaiting verification.'}
];
// Only screenshot-supplied editorial content. Never infer live inventory or layouts.
export const articles = [
 {slug:'2br-vs-3br',category:'Buying guide',title:'2BR vs. 3BR: Which Is Better for Your Growing Family?',description:"A practical look at how space, budget, and your family's next few years should shape the choice between a 2-bedroom and 3-bedroom home."},
 {slug:'condo-that-grows',category:'Interior design',title:'Designing a Condo That Grows With Your Children',description:'Layout ideas, flexible rooms, and storage strategies that adapt as your kids move from toddlers to teenagers.'},
 {slug:'smart-storage',category:'Living tips',title:'Smart Storage Ideas for Family Condo Living',description:'Clever, space-saving storage approaches that keep any family condo feeling open, calm, and organized.'}
];
export function filterProperties(location,bedroom){
 // No bedroom data was supplied. A selected bedroom must not imply availability.
 return properties.filter(p=>(location==='All locations'||(location==='Location pending'?!p.location:p.location===location))&&bedroom==='All layouts');
}
export function validateInquiry(v){
 const errors={};
 if(!v.name?.trim()||v.name.trim().length<2)errors.name='Enter your full name (at least 2 characters).';
 const phone=(v.phone||'').replace(/[\s().-]/g,'');
 if(!/^\+?[0-9]{10,15}$/.test(phone))errors.phone='Enter a valid contact number with 10–15 digits.';
 if(v.email?.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))errors.email='Enter a valid email address.';
 if(!v.consent)errors.consent='Please confirm consent before validating your inquiry.';
 return errors;
}
