const XLSX = require('xlsx');

// xlsx을 이용한 excel 파싱 연습

const workbook = XLSX.readFile('ulsan.csv');
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// 1. 시트를 2차원 배열로 읽음 (헤더 포함)
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 2. 원하는 행을 헤더로 사용
const header = rows[3]; // 4번째 행
const dataRows = rows.slice(4); // 헤더 아래 데이터



// 3. JSON 변환
const jsonData = dataRows.map(row => {
    const obj = {};
    header.forEach((key, idx) => {
        obj[key] = row[idx];
    });

    // 위도(Lat): 열 인덱스 1, 2, 3 >> 문자열 조합
    obj["Lat"] = `${row[1]} ${row[2]} ${row[3]}`;

    // 경도(Lon): 열 인덱스 4, 5, 6 >> 문자열 조합
    obj["Lon"] = `${row[4]} ${row[5]} ${row[6]}`;

    // Time Zone:
    obj["Time Zone"] = `${row[13]} ${row[14]}`;

    return obj;
});

// console.log(sheet);
// console.log(workbook);
console.log(jsonData);
