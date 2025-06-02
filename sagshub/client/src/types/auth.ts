export interface LoginData {
  username: string;
  password: string;
  isWorker: boolean;
}

export interface CustomerLoginData {
  phone: string;
  caseNumber: string;
}

export interface WorkerLoginData {
  username: string;
  password: string;
} 