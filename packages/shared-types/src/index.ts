// Domain enums
export type TradeType =
  | "목공"
  | "도장"
  | "경량"
  | "금속"
  | "전기"
  | "조명"
  | "타일"
  | "유리"
  | "사인"
  | "가구"
  | "턴키";

export type IndustryTemplate = "카페" | "오피스" | "병원" | "상가";

export type UserRole =
  | "super_admin"
  | "sub_admin"
  | "site_manager"
  | "vendor_user"
  | "accounting";

export type ProjectStatus =
  | "draft"
  | "active"
  | "bid_collecting"
  | "contracted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type BidResponseStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "on_hold"
  | "expired";

export type ParseStatus = "pending" | "success" | "failed" | "manual_review";

export type MilestoneType = "advance" | "interim" | "final";

export type SettlementStatus =
  | "requested"
  | "under_review"
  | "approved"
  | "paid"
  | "rejected";

// Standard folder structure
export type ProjectFolderKey =
  | "00_프로젝트기본정보"
  | "01_도면"
  | "02_공내역서_물량"
  | "03_공정일정"
  | "04_협력사발주자료"
  | "05_협력사견적서원본"
  | "06_표준화견적데이터"
  | "07_현장사진_이슈"
  | "08_정산_세무"
  | "09_완료보고"
  | "99_로그_감사기록";

export const PROJECT_FOLDERS: ProjectFolderKey[] = [
  "00_프로젝트기본정보",
  "01_도면",
  "02_공내역서_물량",
  "03_공정일정",
  "04_협력사발주자료",
  "05_협력사견적서원본",
  "06_표준화견적데이터",
  "07_현장사진_이슈",
  "08_정산_세무",
  "09_완료보고",
  "99_로그_감사기록",
] as const;

// API response wrapper
export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
