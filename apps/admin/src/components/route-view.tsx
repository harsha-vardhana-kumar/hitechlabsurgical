'use client';
import dynamic from 'next/dynamic';
const loading=()=> <div className="route-loading" role="status">Loading workspace view…</div>;
const Dashboard=dynamic(()=>import('./dashboard'),{loading});
const Products=dynamic(()=>import('./products'),{loading});
const Categories=dynamic(()=>import('./categories'),{loading});
const Media=dynamic(()=>import('./media'),{loading});
const Featured=dynamic(()=>import('./featured'),{loading});
const Enquiries=dynamic(()=>import('./enquiries'),{loading});
const Content=dynamic(()=>import('./content'),{loading});
const Seo=dynamic(()=>import('./seo'),{loading});
const Settings=dynamic(()=>import('./settings'),{loading});
const System=dynamic(()=>import('./system'),{loading});
export function RouteView({path}:{path:string[]}){switch(path[0]){case undefined:return <Dashboard/>;case 'products':return <Products id={path[1]}/>;case 'categories':return <Categories id={path[1]}/>;case 'media':return <Media/>;case 'featured':return <Featured/>;case 'enquiries':return <Enquiries kind={path[1]==='quotes'?'quote':'contact'} id={path[2]}/>;case 'content':return <Content id={path[1]}/>;case 'seo':return <Seo kind={path[1]==='products'?'product':'page'}/>;case 'settings':return <Settings section={path[1]}/>;case 'activity':return <System section="activity"/>;case 'publishing':return <System section="publishing"/>;default:return null;}}
