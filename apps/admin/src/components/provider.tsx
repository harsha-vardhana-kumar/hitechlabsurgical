'use client';
import Image from 'next/image';
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminWorkspace, AdminCommand, Session, Permission } from '@hitech/types/admin';
import type { WorkspaceRepository } from '../repositories/contracts';
import { DemoLocalAdapter } from '../repositories/demo-local';
import { can } from '../domain/permissions';
import { Modal } from './ui';
type Confirm={title:string;message:string;label?:string};
interface Context {workspace:AdminWorkspace;session:Session;repository:WorkspaceRepository;busy:boolean;notify:(s:string)=>void;run:(c:AdminCommand)=>Promise<string>;upload:(file:File,alt:string)=>Promise<void>;allowed:(p:Permission)=>boolean;confirm:(q:Confirm)=>Promise<boolean>;switchUser:(id:string)=>void;setDirty:(v:boolean)=>void;dirty:boolean;}
const Context=createContext<Context|null>(null);
export function Provider({children}:{children:ReactNode}){
  const [repository]=useState(()=>new DemoLocalAdapter());const [workspace,setWorkspace]=useState<AdminWorkspace>();const [error,setError]=useState('');const [userId,setUserId]=useState('demo-admin');const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [dirty,setDirty]=useState(false);
  const [question,setQuestion]=useState<Confirm>();const resolver=useRef<((v:boolean)=>void)|null>(null);const router=useRouter();
  const confirm=useCallback((q:Confirm)=>new Promise<boolean>(resolve=>{if(resolver.current){resolve(false);return;}resolver.current=resolve;setQuestion(q);}),[]);
  const answer=(ok:boolean)=>{resolver.current?.(ok);resolver.current=null;setQuestion(undefined);};
  const reload=useCallback(()=>repository.load().then(w=>{setWorkspace(w);setError('');}).catch(()=>setError('Could not open the demo workspace. Allow browser storage and retry. Existing records have not been erased.')), [repository]);
  useEffect(()=>{void reload();return repository.subscribe(()=>{void reload();});},[repository,reload]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),6000);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{
    if(!dirty)return;
    const before=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    const click=(e:MouseEvent)=>{const a=(e.target as Element).closest('a[href]');if(!(a instanceof HTMLAnchorElement)||a.target==='_blank'||a.hasAttribute('download')||e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;const next=new URL(a.href);if(next.href===location.href||next.hash&&next.pathname===location.pathname)return;e.preventDefault();e.stopImmediatePropagation();void confirm({title:'Leave without saving?',message:'Your unsaved changes will be discarded. Saved records will stay unchanged.',label:'Discard changes'}).then(ok=>{if(ok){setDirty(false);if(next.origin===location.origin)router.push(next.pathname+next.search);else location.assign(next.href);}});};
    window.addEventListener('beforeunload',before);document.addEventListener('click',click,true);
    return()=>{window.removeEventListener('beforeunload',before);document.removeEventListener('click',click,true);};
  },[dirty,confirm,router]);
  if(!workspace)return <div className="startup" role={error?'alert':'status'}><Image src="/brand/hitech-mark.svg" width="54" height="54" alt="Hitech"/><h1>{error?'Workspace unavailable':'Opening your workspace'}</h1><p>{error||'Loading the local demonstration catalogue…'}</p>{error&&<button className="button" onClick={()=>void reload()}>Retry</button>}</div>;
  const user=workspace.users.find(u=>u.id===userId&&u.active)||workspace.users.find(u=>u.active&&u.role==='Viewer')||workspace.users.find(u=>u.active)!;
  const session:Session={id:user.id,name:user.name,role:user.role,demo:true};
  const run=async(c:AdminCommand)=>{setBusy(true);try{const result=await repository.dispatch(c,session);setWorkspace(result.workspace);return result.id;}finally{setBusy(false);}};
  const upload=async(file:File,alt:string)=>{setBusy(true);try{setWorkspace(await repository.upload(file,alt,session));}finally{setBusy(false);}};
  const switchUser=(id:string)=>{if(dirty){void confirm({title:'Switch demo role?',message:'Save or discard your edits before switching roles.',label:'Discard & switch'}).then(ok=>{if(ok){setDirty(false);setUserId(id);router.push('/');}});}else{setUserId(id);router.push('/');}};
  return <Context.Provider value={{workspace,session,repository,busy,run,upload,allowed:p=>can(session,p),confirm,switchUser,setDirty,dirty,notify:setNotice}}>{children}{notice&&<div className="toast" role="status">{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}>×</button></div>}{question&&<Modal title={question.title} onClose={()=>answer(false)}><p>{question.message}</p><div className="dialog-actions"><button className="button secondary" onClick={()=>answer(false)} autoFocus>Keep editing</button><button className="button" onClick={()=>answer(true)}>{question.label||'Confirm'}</button></div></Modal>}</Context.Provider>;
}
export function useWorkspace(){const c=useContext(Context);if(!c)throw new Error('Workspace provider required.');return c;}
export function useDraft<T>(initial:T){
  const {setDirty}=useWorkspace();const [value,setValue]=useState<T>(()=>structuredClone(initial));const [baseline,setBaseline]=useState(()=>JSON.stringify(initial));const dirty=JSON.stringify(value)!==baseline;
  useEffect(()=>{setDirty(dirty);return()=>setDirty(false);},[dirty,setDirty]);
  const clean=(next:T)=>{setValue(structuredClone(next));setBaseline(JSON.stringify(next));setDirty(false);};
  return {value,setValue,dirty,clean};
}
