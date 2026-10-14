import React from 'react';
import {Compass,MapPin,ImageOff,BedDouble,ArrowRight,Menu,X,MessageCircle} from 'lucide-react';

export const navigation=[['Home','home'],['Explore Properties','properties'],['Family Living','family-living'],['Free Interior Styling','styling'],['About','about'],['Contact','contact']];
export function Brand(){return <a href="#home" className="brand"><span className="brand-icon"><Compass size={23}/></span><span><strong>DMCI Explorer</strong><small>DMCI Homes for Families</small></span></a>}
export function Header({menu,setMenu,active}){
 return <header><div className="header-inner"><Brand/><nav id="mobile-menu" aria-label="Main navigation" className={menu?'open':''}>{navigation.map(([label,id])=><a key={id} href={'#'+id} aria-current={active===id?'location':undefined} onClick={()=>setMenu(false)}>{label}</a>)}</nav><a className="button primary nav-inquire" href="#contact"><MessageCircle size={16}/>Inquire Now</a><button className="menu-button" aria-expanded={menu} aria-controls="mobile-menu" aria-label={menu?'Close navigation':'Open navigation'} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></header>;
}
export function IconTile({icon:Icon}){return <span className="icon-tile"><Icon size={23} strokeWidth={1.8}/></span>}
export function Placeholder({label,tag,property=false}){return <div className={'placeholder '+(property?'property-image':'')}><span className="tag">{property&&<MapPin size={12}/>} {tag}</span><div><ImageOff size={26}/><small>{label}</small></div></div>}
export function PropertyCard({property,onDetails,onInquiry}){
 return <article className="card property-card"><Placeholder property label="Official image coming soon" tag={property.location||'Location pending verification'}/><div className="card-body"><h3>{property.name}</h3><p>{property.description}</p><div className="bedroom-note"><BedDouble size={15}/>Bedroom options confirmed on inquiry</div><div className="card-actions"><button className="button secondary" onClick={()=>onDetails(property)}>View Details</button><button className="button primary" onClick={()=>onInquiry(property.name)}>Inquire<ArrowRight size={15}/></button></div></div></article>;
}
export function ArticleCard({article}){
 return <article className="card article-card"><Placeholder label="Image placeholder" tag={article.category}/><div className="card-body"><h3>{article.title}</h3><p>{article.description}</p><a className="text-link orange-text" href={'#article/'+article.slug}>Read More<ArrowRight size={16}/></a></div></article>;
}
