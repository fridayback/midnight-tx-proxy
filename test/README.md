npx tsx test/stress-test.ts --concurrency 50 --total 500
npx tsx test/stress-test.ts --duration 60 --rate 20
参数说明
参数	默认值	说明
--base-url	http://localhost:3000	服务地址
--concurrency	20	同时发送的请求数
--total	100	总请求数
--duration	0	测试持续时间（秒）
--rate	5	每秒请求数
--timeout	60000	单请求超时（毫秒）
--token-pair-id	1236	代币对 ID