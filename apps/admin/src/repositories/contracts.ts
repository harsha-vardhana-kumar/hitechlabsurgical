import type {
  AdminWorkspace,
  AdminCommand,
  Session,
  AdminProduct,
  AdminCategory,
  MediaAsset,
  Enquiry,
  Settings,
  Activity,
} from "@hitech/types/admin";
export interface ProductRepository {
  listProducts(): Promise<AdminProduct[]>;
}
export interface CategoryRepository {
  listCategories(): Promise<AdminCategory[]>;
}
export interface MediaRepository {
  listMedia(): Promise<MediaAsset[]>;
  readBlob(id: string): Promise<Blob | undefined>;
  upload(file: File, alt: string, session: Session): Promise<AdminWorkspace>;
}
export interface EnquiryRepository {
  listEnquiries(): Promise<Enquiry[]>;
}
export interface SettingsRepository {
  readSettings(): Promise<Settings>;
}
export interface ActivityRepository {
  listActivity(): Promise<Activity[]>;
}
export interface WorkspaceRepository
  extends
    ProductRepository,
    CategoryRepository,
    MediaRepository,
    EnquiryRepository,
    SettingsRepository,
    ActivityRepository {
  load(): Promise<AdminWorkspace>;
  dispatch(
    command: AdminCommand,
    session: Session,
  ): Promise<{ workspace: AdminWorkspace; id: string }>;
  subscribe(listener: () => void): () => void;
}
