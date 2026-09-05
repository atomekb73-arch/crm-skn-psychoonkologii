// ─── Activity Options & Authoritative Official Members Master Registry ────────

export const ACTIVITY_OPTIONS = [
  { id: 'PREZENTACJA', label: 'Prezentacja merytoryczna', icon: '🎤', points: 5 },
  { id: 'DYSKUSJA', label: 'Aktywna dyskusja', icon: '💬', points: 1 },
  { id: 'EDU_VIDEO_PDF', label: 'Filmy / Materiały EDU', icon: '🎬', points: 8 },
  { id: 'BADANIA', label: 'Praca badawcza / Dane', icon: '🔬', points: 5 },
  { id: 'ORG_LOGIST', label: 'Organizacja / Logistyka', icon: '📋', points: 5 },
  { id: 'KONF_AKTYW', label: 'Wystąpienie konferencyjne', icon: '🏆', points: 10 },
  { id: 'KONF_BIER', label: 'Konferencja bierna', icon: '🎫', points: 3 },
  { id: 'OB_STACJO', label: 'Obecność stacjonarna', icon: '🏛️', points: 2 },
];

/**
 * Normalizuje identyfikator indeksu studenta (usuwa znaki nieliczbowe i wiodące zera)
 */
export function normalizeStudentIndex(idx) {
  if (!idx) return '';
  return String(idx).replace(/\D/g, '').replace(/^0+/, '').trim();
}

/**
 * Oficjalny autorytatywny rejestr członków SKN Seksuologii (140 pozycji)
 * Zawiera: Imię i Nazwisko, Nr Indeksu, Oficjalną sumę punktów oraz Frekwencję w %
 */
export const OFFICIAL_MEMBERS_MASTER_REGISTRY = {
  '15998': { name: 'Tomasz Bratkowski', index: '15998', points: 138, attendancePercent: 100, present: 12, absent: 0 },
  '18235': { name: 'Ewelina Kozłowska', index: '18235', points: 122, attendancePercent: 100, present: 12, absent: 0 },
  '12316': { name: 'Dorota Rogulska', index: '12316', points: 9, attendancePercent: 82, present: 9, absent: 3 },
  '8194':  { name: 'Sylwia Kandziora', index: '8194', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '11157': { name: 'Aleksandra Głowacka', index: '11157', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '29246': { name: 'Anna Szulc', index: '29246', points: 14, attendancePercent: 55, present: 6, absent: 6 },
  '19078': { name: 'Alicja Pająk', index: '19078', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '6418':  { name: 'Jarosław Paszkiewicz', index: '6418', points: 10, attendancePercent: 91, present: 10, absent: 2 },
  '8779':  { name: 'Klaudia Woda', index: '8779', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '9063':  { name: 'Agnieszka Rydz', index: '9063', points: 11, attendancePercent: 100, present: 11, absent: 1 },
  '5924':  { name: 'Dorota Czopek', index: '5924', points: 10, attendancePercent: 91, present: 10, absent: 2 },
  '7830':  { name: 'Piotr Niklas', index: '7830', points: 12, attendancePercent: 55, present: 6, absent: 6 },
  '13221': { name: 'Paula Kamzol', index: '13221', points: 66, attendancePercent: 100, present: 12, absent: 0 },
  '19866': { name: 'Bogumiła Kwasowiec-Pietroń', index: '19866', points: 10, attendancePercent: 91, present: 10, absent: 2 },
  '17543': { name: 'Anna Werner', index: '17543', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '21671': { name: 'Justyna Kabała', index: '21671', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '8032':  { name: 'Sylwia Berendt', index: '8032', points: 10, attendancePercent: 91, present: 10, absent: 2 },
  '12309': { name: 'Magdalena Paluch', index: '12309', points: 13, attendancePercent: 73, present: 8, absent: 4 },
  '20574': { name: 'Sylwia Rymuszka', index: '20574', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '24185': { name: 'Diana Kosta', index: '24185', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '20716': { name: 'Katarzyna Reguła-Lubińska', index: '20716', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '24071': { name: 'Iga Zakrzewska-Morawek', index: '24071', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '13745': { name: 'Elżbieta Szydłowska', index: '13745', points: 7, attendancePercent: 64, present: 7, absent: 5 },
  '8642':  { name: 'Magdalena Szewczyk', index: '8642', points: 14, attendancePercent: 82, present: 9, absent: 3 },
  '16461': { name: 'Aneta Kucman', index: '16461', points: 15, attendancePercent: 91, present: 10, absent: 2 },
  '24913': { name: 'Hanna Adamska', index: '24913', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '25136': { name: 'Marek Adamczak', index: '25136', points: 4, attendancePercent: 36, present: 4, absent: 8 },
  '20116': { name: 'Magdalena Korba', index: '20116', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '5176':  { name: 'Agnieszka Katana', index: '5176', points: 4, attendancePercent: 36, present: 4, absent: 8 },
  '17388': { name: 'Kinga Franczak', index: '17388', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '6601':  { name: 'Kamila Turek', index: '6601', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '28798': { name: 'Dorota Boczula', index: '28798', points: 4, attendancePercent: 36, present: 4, absent: 8 },
  '20559': { name: 'Adrianna Jakubów', index: '20559', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '24218': { name: 'Marika Skrzela', index: '24218', points: 4, attendancePercent: 36, present: 4, absent: 8 },
  '20350': { name: 'Aneta Staniec', index: '20350', points: 17, attendancePercent: 73, present: 8, absent: 4 },
  '12630': { name: 'Monika Marchlewicz-Frelek', index: '12630', points: 9, attendancePercent: 82, present: 9, absent: 3 },
  '12741': { name: 'Dagmara Wojciechowska-Wełna', index: '12741', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '11654': { name: 'Michał Rodak', index: '11654', points: 20, attendancePercent: 91, present: 10, absent: 2 },
  '15161': { name: 'Wioletta Pokrzywnicka', index: '15161', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '20806': { name: 'Anna Pławecka', index: '20806', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '15014': { name: 'Magda Mazur', index: '15014', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '13226': { name: 'Monika Szymura', index: '13226', points: 7, attendancePercent: 64, present: 7, absent: 5 },
  '20417': { name: 'Nomin Galindev', index: '20417', points: 4, attendancePercent: 36, present: 4, absent: 8 },
  '10372': { name: 'Adrian Puczkowski', index: '10372', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '13915': { name: 'Marta Orłowska', index: '13915', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '16483': { name: 'Zofia Pobłocka', index: '16483', points: 20, attendancePercent: 100, present: 12, absent: 0 },
  '16480': { name: 'Ewa Sobiecka-Durmaj', index: '16480', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '14468': { name: 'Karolina Pogorzelska', index: '14468', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '15963': { name: 'Elżbieta Antkiewicz', index: '15963', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '20096': { name: 'Agnieszka Czechowska', index: '20096', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '18902': { name: 'Wiesława Frankiewicz', index: '18902', points: 10, attendancePercent: 91, present: 10, absent: 2 },
  '17248': { name: 'Luiza Kochanek', index: '17248', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '9244':  { name: 'Ewa Łuczak', index: '9244', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '21311': { name: 'Andrzej Brąszewski', index: '21311', points: 7, attendancePercent: 64, present: 7, absent: 5 },
  '23028': { name: 'Anna Bijak', index: '23028', points: 7, attendancePercent: 64, present: 7, absent: 5 },
  '15781': { name: 'Joanna Lauer', index: '15781', points: 9, attendancePercent: 82, present: 9, absent: 3 },
  '10148': { name: 'Marcin Mróz', index: '10148', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '17438': { name: 'Jolanta Falkiewicz', index: '17438', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '24135': { name: 'Marta Brejla-Rędowicz', index: '24135', points: 17, attendancePercent: 82, present: 9, absent: 3 },
  '12852': { name: 'Wiktoria Gowin', index: '12852', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '26814': { name: 'Katarzyna Zaorska-Podsiadło', index: '26814', points: 10, attendancePercent: 91, present: 10, absent: 2 },
  '27659': { name: 'Marcelina Malinowska', index: '27659', points: 11, attendancePercent: 100, present: 11, absent: 1 },
  '16200': { name: 'Aleksandra Ziemnicka', index: '16200', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '10459': { name: 'Monika Parisi', index: '10459', points: 7, attendancePercent: 64, present: 7, absent: 5 },
  '27149': { name: 'Katarzyna Lemieszek-Kasperowicz', index: '27149', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '26103': { name: 'Igor Leśniewski', index: '26103', points: 3, attendancePercent: 27, present: 3, absent: 9 },
  '25637': { name: 'Ewa Bator', index: '25637', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '19865': { name: 'Edyta Karczewska', index: '19865', points: 5, attendancePercent: 45, present: 5, absent: 7 },
  '8854':  { name: 'Ewa Utratna', index: '8854', points: 6, attendancePercent: 55, present: 6, absent: 6 },
  '7305':  { name: 'Maria Podhorecka', index: '7305', points: 8, attendancePercent: 73, present: 8, absent: 4 },
  '27947': { name: 'Natalia Sawicka', index: '27947', points: 7, attendancePercent: 64, present: 7, absent: 5 },
  '5676':  { name: 'Ewa Siwiec', index: '5676', points: 6, attendancePercent: 45, present: 5, absent: 7 },
  '2419':  { name: 'Iwona Stachowicz', index: '2419', points: 10, attendancePercent: 100, present: 10, absent: 2 },
  '8164':  { name: 'Magdalena Sterczała', index: '8164', points: 12, attendancePercent: 70, present: 7, absent: 5 },
  '23090': { name: 'Marzena Bogacz', index: '23090', points: 9, attendancePercent: 90, present: 9, absent: 3 },
  '5695':  { name: 'Monika Chudecka', index: '5695', points: 4, attendancePercent: 40, present: 4, absent: 8 },
  '7406':  { name: 'Edyta Preobrażeńska', index: '7406', points: 19, attendancePercent: 100, present: 10, absent: 2 },
  '25687': { name: 'Jolanta Ochęduszko', index: '25687', points: 5, attendancePercent: 50, present: 5, absent: 7 },
  '14517': { name: 'Krystian Wyszomirski', index: '14517', points: 9, attendancePercent: 89, present: 8, absent: 4 },
  '24500': { name: 'Sylwia Rydzek - Zamlewska', index: '24500', points: 2, attendancePercent: 22, present: 2, absent: 9 },
  '6267':  { name: 'Bożena Pasek', index: '6267', points: 3, attendancePercent: 33, present: 3, absent: 8 },
  '7702':  { name: 'Jolanta Rakowska', index: '7702', points: 4, attendancePercent: 44, present: 4, absent: 7 },
  '26535': { name: 'Magda Czepirska', index: '26535', points: 24, attendancePercent: 100, present: 10, absent: 1 },
  '31555': { name: 'Justyna Kożuch', index: '31555', points: 46, attendancePercent: 100, present: 10, absent: 1 },
  '2701':  { name: 'Natalia Głaszczka', index: '2701', points: 3, attendancePercent: 33, present: 3, absent: 8 },
  '34327': { name: 'Monika Łyniewska', index: '34327', points: 5, attendancePercent: 56, present: 5, absent: 5 },
  '19978': { name: 'Aleksandra Bielecka', index: '19978', points: 4, attendancePercent: 44, present: 4, absent: 8 },
  '33564': { name: 'Katarzyna Świerdza', index: '33564', points: 10, attendancePercent: 100, present: 10, absent: 1 },
  '26392': { name: 'Milena Kłosowska', index: '26392', points: 8, attendancePercent: 78, present: 7, absent: 5 },
  '9909':  { name: 'Anna Michalczuk', index: '9909', points: 3, attendancePercent: 38, present: 3, absent: 7 },
  '23154': { name: 'Elżbieta Cieślak-Janusz', index: '23154', points: 8, attendancePercent: 100, present: 8, absent: 2 },
  '20262': { name: 'Małgorzata Żyła', index: '20262', points: 3, attendancePercent: 38, present: 3, absent: 7 },
  '20329': { name: 'Paulina Gunter', index: '20329', points: 6, attendancePercent: 75, present: 6, absent: 4 },
  '18313': { name: 'Nikola Chochlińska', index: '18313', points: 1, attendancePercent: 13, present: 1, absent: 9 },
  '28444': { name: 'Barbara Kupińska', index: '28444', points: 4, attendancePercent: 50, present: 4, absent: 6 },
  '31233': { name: 'Karolina Goździewicz', index: '31233', points: 3, attendancePercent: 38, present: 3, absent: 7 },
  '31903': { name: 'Ewa Przechrzta-Bart', index: '31903', points: 7, attendancePercent: 88, present: 7, absent: 3 },
  '26271': { name: 'Aneta Wierzbowska', index: '26271', points: 2, attendancePercent: 25, present: 2, absent: 8 },
  '11877': { name: 'Julia Stawna', index: '11877', points: 14, attendancePercent: 75, present: 6, absent: 4 },
  '9646':  { name: 'Agata Kulig', index: '9646', points: 5, attendancePercent: 63, present: 5, absent: 5 },
  '20418': { name: 'Patrycja Sas', index: '20418', points: 2, attendancePercent: 25, present: 2, absent: 8 },
  '22024': { name: 'Iwona Koppa', index: '22024', points: 6, attendancePercent: 75, present: 6, absent: 4 },
  '10084': { name: 'Katarzyna Jastrzębska', index: '10084', points: 3, attendancePercent: 43, present: 3, absent: 6 },
  '27026': { name: 'Mariusz Miszkiel', index: '27026', points: 4, attendancePercent: 57, present: 4, absent: 5 },
  '5609':  { name: 'Martyna Molenda', index: '5609', points: 3, attendancePercent: 43, present: 3, absent: 6 },
  '31962': { name: 'Julia Krawczenko', index: '31962', points: 5, attendancePercent: 71, present: 5, absent: 4 },
  '27040': { name: 'Dorota Bałacińska', index: '27040', points: 3, attendancePercent: 43, present: 3, absent: 6 },
  '15717': { name: 'Gabriela Czapla', index: '15717', points: 5, attendancePercent: 71, present: 5, absent: 4 },
  '29175': { name: 'Małgorzata Bielikowicz', index: '29175', points: 8, attendancePercent: 100, present: 8, absent: 0 },
  '29056': { name: 'Alicja Kubiak', index: '29056', points: 2, attendancePercent: 29, present: 2, absent: 7 },
  '19982': { name: 'Sylwia Kluk', index: '19982', points: 6, attendancePercent: 86, present: 6, absent: 2 },
  '29101': { name: 'Jowita Wójcik - Chudyk', index: '29101', points: 2, attendancePercent: 29, present: 2, absent: 7 },
  '24335': { name: 'Ewelina Sałach', index: '24335', points: 2, attendancePercent: 27, present: 2, absent: 8 },
  '17617': { name: 'Anna Szablicka-Prytko', index: '17617', points: 3, attendancePercent: 43, present: 3, absent: 5 },
  '31668': { name: 'Paulina Nowak', index: '31668', points: 5, attendancePercent: 71, present: 5, absent: 3 },
  '21879': { name: 'Daria Rybka-Koch', index: '21879', points: 6, attendancePercent: 86, present: 6, absent: 2 },
  '11376': { name: 'Jagoda Kawczyńska', index: '11376', points: 5, attendancePercent: 71, present: 5, absent: 3 },
  '22615': { name: 'Gabriela Nowak', index: '22615', points: 14, attendancePercent: 71, present: 5, absent: 3 },
  '10543': { name: 'Agnieszka Hulboj', index: '10543', points: 7, attendancePercent: 86, present: 6, absent: 2 },
  '25149': { name: 'Karolina Gabryś', index: '25149', points: 4, attendancePercent: 57, present: 4, absent: 4 },
  '26385': { name: 'Emil Kacprzak', index: '26385', points: 2, attendancePercent: 29, present: 2, absent: 6 },
  '30645': { name: 'Ireneusz Pawlik', index: '30645', points: 7, attendancePercent: 100, present: 7, absent: 1 },
  '22105': { name: 'Barbara Malinowska', index: '22105', points: 3, attendancePercent: 43, present: 3, absent: 5 },
  '19060': { name: 'Daria Bienias', index: '19060', points: 5, attendancePercent: 71, present: 5, absent: 3 },
  '24217': { name: 'Justyna Wabik', index: '24217', points: 1, attendancePercent: 14, present: 1, absent: 6 },
  '21829': { name: 'Ewa Kamont', index: '21829', points: 1, attendancePercent: 17, present: 1, absent: 7 },
  '22935': { name: 'Jakub Gwizdała', index: '22935', points: 1, attendancePercent: 17, present: 1, absent: 6 },
  '37458': { name: 'Sylwia Janowiak', index: '37458', points: 2, attendancePercent: 33, present: 2, absent: 4 },
  '17035': { name: 'Karolina Kościuszko', index: '17035', points: 1, attendancePercent: 17, present: 1, absent: 5 },
  '18741': { name: 'Hanna Liebner', index: '18741', points: 3, attendancePercent: 50, present: 3, absent: 4 },
  '13057': { name: 'Weronika Sykuła', index: '13057', points: 1, attendancePercent: 17, present: 1, absent: 5 },
  '35576': { name: 'Anna Różycka - Buszko', index: '35576', points: 3, attendancePercent: 67, present: 3, absent: 3 },
  '690':   { name: 'Patrycja Szczepańska', index: '690', points: 1, attendancePercent: 0, present: 1, absent: 0 },
  '32522': { name: 'Joanna Leśniewska', index: '32522', points: 1, attendancePercent: 25, present: 1, absent: 7 },
  '28554': { name: 'Marzena Tarłowska', index: '28554', points: 0, attendancePercent: 0, present: 0, absent: 0 },
  '28589': { name: 'Joanna Woch', index: '28589', points: 1, attendancePercent: 25, present: 1, absent: 7 },
  '27808': { name: 'Oliwia Ptasińska', index: '27808', points: 0, attendancePercent: 0, present: 0, absent: 0 },
  '25078': { name: 'Paweł Swajda', index: '25078', points: 1, attendancePercent: 25, present: 1, absent: 3 },
  '34762': { name: 'Patryk Borowiak', index: '34762', points: 0, attendancePercent: 0, present: 0, absent: 0 },
  '35172': { name: 'Szymon Manikowski', index: '35172', points: 0, attendancePercent: 0, present: 0, absent: 0 },
};

export const activityRegistry = OFFICIAL_MEMBERS_MASTER_REGISTRY;

/**
 * Zwraca bezpieczne statystyki członka na podstawie numeru indeksu
 */
export const getMemberStats = (indexNumber) => {
  if (!indexNumber) {
    return { points: 0, freq: 0, attended: 0, absences: 12, present: 0, absent: 12 };
  }
  const cleanIdx = normalizeStudentIndex(indexNumber);
  const rec = OFFICIAL_MEMBERS_MASTER_REGISTRY[cleanIdx] || OFFICIAL_MEMBERS_MASTER_REGISTRY[String(indexNumber)];
  if (!rec) {
    return { points: 0, freq: 0, attended: 0, absences: 12, present: 0, absent: 12 };
  }
  const freq = typeof rec.freq === 'number' ? rec.freq : (typeof rec.attendancePercent === 'number' ? rec.attendancePercent : 0);
  const attended = typeof rec.attended === 'number' ? rec.attended : (typeof rec.present === 'number' ? rec.present : 0);
  const absences = typeof rec.absences === 'number' ? rec.absences : (typeof rec.absent === 'number' ? rec.absent : Math.max(0, 12 - attended));
  const points = typeof rec.points === 'number' ? rec.points : 0;
  return {
    ...rec,
    points,
    freq,
    attendancePercent: freq,
    attended,
    present: attended,
    absences,
    absent: absences,
  };
};

/**
 * Pobiera oficjalny rekord obecności członka z rejestru
 */
export function getOfficialMemberAttendance(memberOrIndex) {
  const rec = getOfficialMemberRecord(memberOrIndex);
  if (rec && (typeof rec.present === 'number' || typeof rec.attended === 'number')) {
    const p = typeof rec.present === 'number' ? rec.present : (rec.attended || 0);
    const a = typeof rec.absent === 'number' ? rec.absent : (typeof rec.absences === 'number' ? rec.absences : Math.max(0, 12 - p));
    return {
      present: p,
      absent: a,
      attended: p,
      absences: a,
    };
  }
  return null;
}

/**
 * Pobiera oficjalny rekord członka z rejestru
 */
export function getOfficialMemberRecord(memberOrIndex) {
  if (!memberOrIndex) return null;
  if (typeof memberOrIndex === 'object') {
    if (memberOrIndex.id?.startsWith('sknu_') || memberOrIndex.fromSheet?.includes('SKNU')) {
      return null;
    }
  }
  const rawIdx = typeof memberOrIndex === 'object'
    ? (memberOrIndex.index || memberOrIndex.indexNumber || memberOrIndex.cleanIndex)
    : memberOrIndex;
  const cleanIdx = normalizeStudentIndex(rawIdx);
  return OFFICIAL_MEMBERS_MASTER_REGISTRY[cleanIdx] || null;
}

/**
 * Oblicza łączne punkty studenta ze wszystkich źródeł
 */
export function getMemberPointsSum(member, meetings = [], weights = {}) {
  if (!member) return 0;
  const isSknu = typeof member === 'object' && (member.id?.startsWith('sknu_') || member.fromSheet?.includes('SKNU'));
  const cleanIdx = normalizeStudentIndex(member.index || member.indexNumber || member.cleanIndex);
  let pts = 0;

  // 1. Sprawdź autorytatywny rejestr oficjalny (tylko dla Seksuologii)
  if (!isSknu) {
    const official = OFFICIAL_MEMBERS_MASTER_REGISTRY[cleanIdx];
    if (official && typeof official.points === 'number') {
      pts = official.points;
    } else if (typeof member.points === 'number' && member.points > 0) {
      pts = member.points;
    } else if (typeof member.initialPoints === 'number' && member.initialPoints > 0) {
      pts = member.initialPoints;
    } else if (typeof member.present === 'number' && member.present > 0) {
      pts = member.present;
    }
  } else {
    pts = typeof member.points === 'number' ? member.points : 0;
  }

  // 2. Dodaj punkty z nowo przypisanych w sesji aktywności ze spotkań (localStorage)
  if (typeof window !== 'undefined') {
    meetings.forEach(m => {
      if (m.isUpcoming) return;
      const meetingKey = `crm_attendance_${m.id || m.date}`;
      try {
        const savedRaw = localStorage.getItem(meetingKey);
        if (savedRaw) {
          const savedData = JSON.parse(savedRaw);
          const attendees = savedData.attendees || [];
          const matched = attendees.find(att => {
            const attIdx = normalizeStudentIndex(att.member?.index || att.index);
            if (cleanIdx && attIdx === cleanIdx) return true;
            if (member.fullName && att.rawName && att.rawName.toLowerCase().includes(member.lastName?.toLowerCase() || '')) return true;
            return false;
          });

          if (matched) {
            const activities = Array.isArray(matched.activities) ? matched.activities : [];
            activities.forEach(actId => {
              const w = weights[actId];
              pts += (w?.points || ACTIVITY_OPTIONS.find(o => o.id === actId)?.points || 0);
            });
          }
        }
      } catch {}
    });
  }

  return pts;
}

/**
 * Zwraca oficjalną frekwencję lub dynamicznie obliczoną
 */
export function getMemberAttendancePercent(member, calculatedFreq = null) {
  if (!member) return 0;
  const official = getOfficialMemberRecord(member);
  if (official && typeof official.attendancePercent === 'number') {
    return official.attendancePercent;
  }
  return calculatedFreq ?? 0;
}

export const HISTORICAL_MEMBER_ACTIVITIES = OFFICIAL_MEMBERS_MASTER_REGISTRY;
