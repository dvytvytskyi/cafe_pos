export interface Employee {
  id: string;
  name: string;
  position: string;
  section: 'Floor' | 'Kitchen';
  nie: string;
  phone: string;
  email: string;
  contractStart: string;
  contractEnd?: string;
  scheduleStart: string; // e.g. "10:00"
  scheduleEnd: string; // e.g. "15:00"
  daysPerWeek: number;
  avatarInitials: string;
  status: 'active' | 'inactive';
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string | null; // ISO string
  checkOutTime: string | null;
  totalHours: number;
  status: 'pending' | 'on_shift' | 'completed';
}

export const getEmployees = (): Employee[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('corgi_employees_v2');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse employees", e);
    }
  }

  const mocks: Employee[] = [
    {
      id: 'EMP-001',
      name: 'Albert Mesropov',
      position: 'Cleaner',
      section: 'Kitchen',
      nie: 'Z01155998V',
      phone: '+34 634 801 095',
      email: 'albertmesropov@gmail.com',
      contractStart: '2026-07-06',
      scheduleStart: '10:00',
      scheduleEnd: '15:00',
      daysPerWeek: 5,
      avatarInitials: 'AM',
      status: 'active'
    },
    {
      id: 'EMP-002',
      name: 'Anna Muñoz Hidalgo',
      position: 'Waiter',
      section: 'Floor',
      nie: '39967929',
      phone: '+34 674 40 58 34',
      email: 'amhidalgo365@gmail.com',
      contractStart: '2025-09-18',
      scheduleStart: '10:00',
      scheduleEnd: '17:00',
      daysPerWeek: 5,
      avatarInitials: 'AM',
      status: 'active'
    },
    {
      id: 'EMP-003',
      name: 'Denis Donets',
      position: 'Bartender',
      section: 'Floor',
      nie: 'Z4078615F',
      phone: '+34 666 637 197',
      email: 'dontdent@gmail.com',
      contractStart: '2026-05-28',
      scheduleStart: '10:00',
      scheduleEnd: '16:00',
      daysPerWeek: 5,
      avatarInitials: 'DD',
      status: 'active'
    },
    {
      id: 'EMP-004',
      name: 'Evgenii Latyshev',
      position: 'Cleaner',
      section: 'Kitchen',
      nie: 'Y9981195Z',
      phone: '+34 635 736 649',
      email: 'latyshevev1980@gmail.com',
      contractStart: '2026-01-02',
      scheduleStart: '10:00',
      scheduleEnd: '15:00',
      daysPerWeek: 5,
      avatarInitials: 'EL',
      status: 'active'
    },
    {
      id: 'EMP-005',
      name: 'HEORHII SAAKIAN',
      position: 'Chef',
      section: 'Kitchen',
      nie: 'Z4399350F',
      phone: '+380 99 708 4308',
      email: 'gugosaakyan@gmail.com',
      contractStart: '2026-04-22',
      scheduleStart: '09:00',
      scheduleEnd: '15:00',
      daysPerWeek: 5,
      avatarInitials: 'HS',
      status: 'active'
    }
  ];

  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_employees_v2', JSON.stringify(mocks));
  }
  return mocks;
};

export const saveEmployees = (employees: Employee[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_employees_v2', JSON.stringify(employees));
  }
};

export const getTimeEntries = (date: string): TimeEntry[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(`corgi_time_entries_v2_${date}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse time entries", e);
    }
  }

  // Initialize empty or mock entries for the date
  const employees = getEmployees();
  const entries: TimeEntry[] = employees.map((emp, index) => {
    // Generate some random states for the mock
    let status: 'pending' | 'on_shift' | 'completed' = 'pending';
    let checkInTime = null;
    let checkOutTime = null;
    let totalHours = 0;

    if (index === 3 || index === 4) {
      status = 'on_shift';
      checkInTime = new Date();
      checkInTime.setHours(9, 30 + index, 0, 0); // Mock check-in time
    } else if (index === 0) {
      status = 'completed';
      checkInTime = new Date();
      checkInTime.setHours(8, 0, 0, 0);
      checkOutTime = new Date();
      checkOutTime.setHours(14, 0, 0, 0);
      totalHours = 6;
    }

    return {
      id: `TE-${emp.id}-${date}`,
      employeeId: emp.id,
      date,
      checkInTime: checkInTime ? checkInTime.toISOString() : null,
      checkOutTime: checkOutTime ? checkOutTime.toISOString() : null,
      totalHours,
      status
    };
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(`corgi_time_entries_v2_${date}`, JSON.stringify(entries));
  }
  return entries;
};

export const saveTimeEntries = (date: string, entries: TimeEntry[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`corgi_time_entries_v2_${date}`, JSON.stringify(entries));
  }
};
