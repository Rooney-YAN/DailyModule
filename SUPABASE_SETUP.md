# DailyModule 跨设备同步配置

DailyModule 仍由 GitHub Pages 托管。Supabase 只保存登录用户自己的 DailyModule JSON 数据。

## 1. 创建 Supabase 项目

1. 登录 <https://supabase.com/dashboard>，创建一个 Free 项目。
2. 在 **SQL Editor** 新建查询。
3. 完整执行 [`supabase/schema.sql`](supabase/schema.sql)。
4. 在 **Authentication → Providers → Email** 中保持 Email 登录开启。
5. 在 **Authentication → URL Configuration** 中设置：
   - Site URL：`https://rooney-yan.github.io/DailyModule/`
   - Redirect URL：`https://rooney-yan.github.io/DailyModule/`

## 2. 获取前端公共配置

打开 **Project Settings → API**，复制：

- Project URL
- Publishable key（旧项目可能显示为 `anon public` key）

Publishable/anon key 可以用于前端；权限由数据库 RLS 控制。不要复制或提交 `service_role` key。

## 3. 配置本地开发

复制 `.env.example` 为 `.env.local`，填写：

```env
VITE_SUPABASE_URL=https://你的项目编号.supabase.co
VITE_SUPABASE_ANON_KEY=你的_publishable_或_anon_key
```

`.env.local` 已被 Git 忽略，不会上传到仓库。

## 4. 配置 GitHub Pages 构建

打开 GitHub 仓库：

**Settings → Secrets and variables → Actions → Variables → New repository variable**

创建两个 Repository variables：

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Publishable/anon key |

然后在 **Actions → Deploy to GitHub Pages → Run workflow** 手动重新部署一次，或推送一次代码。

## 5. 第一次同步

1. 先在有完整数据的电脑上打开 DailyModule。
2. 进入 **设置 → 跨设备同步**，创建账号或登录。
3. 云端还没有数据时，当前电脑的数据会成为初始云端数据。
4. 在手机上打开同一网址，并登录同一账号；手机会下载云端数据。

以后修改会在短暂延迟后自动上传。浏览器仍保留 localStorage 缓存，所以短暂离线时可以继续使用；恢复联网后再次修改即可同步。

## 安全说明

- 不要把 GitHub Personal Access Token、Supabase `service_role` key 或数据库密码放进仓库或网页。
- `supabase/schema.sql` 已启用 Row Level Security；每个账号只能读写与自己 `user_id` 相同的数据行。
