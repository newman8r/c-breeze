SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '9815ede2-5005-4260-a360-68671c0f6d91', '{"action":"user_signedup","actor_id":"82f0d568-7c30-42a3-b787-4557e81f93e7","actor_username":"smnewman07+11@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-01-24 18:39:29.835753+00', ''),
	('00000000-0000-0000-0000-000000000000', '478a54b0-aab5-4a36-b7a8-0a4565f4c5e2', '{"action":"login","actor_id":"82f0d568-7c30-42a3-b787-4557e81f93e7","actor_username":"smnewman07+11@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-01-24 18:39:29.84216+00', ''),
	('00000000-0000-0000-0000-000000000000', '4f353ee8-7df8-4fab-9eee-b3a702fe5fd8', '{"action":"login","actor_id":"82f0d568-7c30-42a3-b787-4557e81f93e7","actor_username":"smnewman07+11@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-01-24 18:39:30.272733+00', ''),
	('00000000-0000-0000-0000-000000000000', '4ae2c348-247a-481e-8cff-e1352dd9aad1', '{"action":"user_signedup","actor_id":"8be2871a-4f09-4465-9d46-b4a0acf4079e","actor_username":"smnewman07+1er1@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-01-24 18:40:28.310261+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e1103cc2-cd8c-4026-af6d-25ed92ec0ade', '{"action":"login","actor_id":"8be2871a-4f09-4465-9d46-b4a0acf4079e","actor_username":"smnewman07+1er1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-01-24 18:40:28.315691+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd428fcac-0524-4a8b-aa63-f0329418e9f7', '{"action":"login","actor_id":"8be2871a-4f09-4465-9d46-b4a0acf4079e","actor_username":"smnewman07+1er1@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-01-24 18:40:28.568243+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '82f0d568-7c30-42a3-b787-4557e81f93e7', 'authenticated', 'authenticated', 'smnewman07+11@gmail.com', '$2a$10$7VmOhJ1vsfZvZx88EkybFenkv2FqMyqOpq6bBu4zuPKZLB.pPTNZK', '2025-01-24 18:39:29.837468+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-24 18:39:30.273238+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "82f0d568-7c30-42a3-b787-4557e81f93e7", "email": "smnewman07+11@gmail.com", "org_name": "smitchco", "email_verified": true, "phone_verified": false}', NULL, '2025-01-24 18:39:29.818365+00', '2025-01-24 18:39:30.275469+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '8be2871a-4f09-4465-9d46-b4a0acf4079e', 'authenticated', 'authenticated', 'smnewman07+1er1@gmail.com', '$2a$10$sKpYkDLhL3G5rdqzmaDdSu.BPEV8biW1l9d3iTkGiViW8Dtnch3sa', '2025-01-24 18:40:28.31126+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-01-24 18:40:28.569095+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "8be2871a-4f09-4465-9d46-b4a0acf4079e", "email": "smnewman07+1er1@gmail.com", "email_verified": true, "phone_verified": false, "organization_id": "80997576-d610-4185-969b-ccef10b2aed6"}', NULL, '2025-01-24 18:40:28.304815+00', '2025-01-24 18:40:28.57161+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('82f0d568-7c30-42a3-b787-4557e81f93e7', '82f0d568-7c30-42a3-b787-4557e81f93e7', '{"sub": "82f0d568-7c30-42a3-b787-4557e81f93e7", "email": "smnewman07+11@gmail.com", "org_name": "smitchco", "email_verified": false, "phone_verified": false}', 'email', '2025-01-24 18:39:29.828573+00', '2025-01-24 18:39:29.828698+00', '2025-01-24 18:39:29.828698+00', '63ca2ea3-3998-4388-abaf-b2ce370b69eb'),
	('8be2871a-4f09-4465-9d46-b4a0acf4079e', '8be2871a-4f09-4465-9d46-b4a0acf4079e', '{"sub": "8be2871a-4f09-4465-9d46-b4a0acf4079e", "email": "smnewman07+1er1@gmail.com", "email_verified": false, "phone_verified": false, "organization_id": "80997576-d610-4185-969b-ccef10b2aed6"}', 'email', '2025-01-24 18:40:28.306877+00', '2025-01-24 18:40:28.306932+00', '2025-01-24 18:40:28.306932+00', 'd8ddd4ed-7014-4ed0-9b0e-589fadd46114');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") VALUES
	('d91c7caf-ac8e-46ca-85f7-65e1cbac1c3c', '82f0d568-7c30-42a3-b787-4557e81f93e7', '2025-01-24 18:39:29.843296+00', '2025-01-24 18:39:29.843296+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', '172.19.0.1', NULL),
	('572d93d3-065a-4851-b4e4-dc6e6a05602f', '82f0d568-7c30-42a3-b787-4557e81f93e7', '2025-01-24 18:39:30.273334+00', '2025-01-24 18:39:30.273334+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', '172.19.0.1', NULL),
	('f455ff79-ab9d-48f3-b5ce-d05b530fe931', '8be2871a-4f09-4465-9d46-b4a0acf4079e', '2025-01-24 18:40:28.316431+00', '2025-01-24 18:40:28.316431+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', '172.19.0.1', NULL),
	('91b6c5d3-5d60-4f03-9846-de6cfa32437b', '8be2871a-4f09-4465-9d46-b4a0acf4079e', '2025-01-24 18:40:28.569272+00', '2025-01-24 18:40:28.569272+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', '172.19.0.1', NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('d91c7caf-ac8e-46ca-85f7-65e1cbac1c3c', '2025-01-24 18:39:29.852147+00', '2025-01-24 18:39:29.852147+00', 'password', 'ffe7c582-ec3d-4d12-bf79-47df46b0ee22'),
	('572d93d3-065a-4851-b4e4-dc6e6a05602f', '2025-01-24 18:39:30.275858+00', '2025-01-24 18:39:30.275858+00', 'password', 'ee360a24-3cb0-4aef-8347-b82d384a23f3'),
	('f455ff79-ab9d-48f3-b5ce-d05b530fe931', '2025-01-24 18:40:28.319027+00', '2025-01-24 18:40:28.319027+00', 'password', '8a19ad4e-c1d7-4c4e-8742-315f66cd5aaf'),
	('91b6c5d3-5d60-4f03-9846-de6cfa32437b', '2025-01-24 18:40:28.572107+00', '2025-01-24 18:40:28.572107+00', 'password', '1b76f830-a6e0-4d6b-a207-85854704238f');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 'gkrlrvy8fMgySNkkGYBi0Q', '82f0d568-7c30-42a3-b787-4557e81f93e7', false, '2025-01-24 18:39:29.846928+00', '2025-01-24 18:39:29.846928+00', NULL, 'd91c7caf-ac8e-46ca-85f7-65e1cbac1c3c'),
	('00000000-0000-0000-0000-000000000000', 2, 'S8zAyeHQKsLj79HP3IBw-g', '82f0d568-7c30-42a3-b787-4557e81f93e7', false, '2025-01-24 18:39:30.273922+00', '2025-01-24 18:39:30.273922+00', NULL, '572d93d3-065a-4851-b4e4-dc6e6a05602f'),
	('00000000-0000-0000-0000-000000000000', 3, 'dU4IW8LnWKu85jqV8o3XSw', '8be2871a-4f09-4465-9d46-b4a0acf4079e', false, '2025-01-24 18:40:28.317366+00', '2025-01-24 18:40:28.317366+00', NULL, 'f455ff79-ab9d-48f3-b5ce-d05b530fe931'),
	('00000000-0000-0000-0000-000000000000', 4, 'DAMOs69PAb4Qtg_aNhVdnQ', '8be2871a-4f09-4465-9d46-b4a0acf4079e', false, '2025-01-24 18:40:28.570237+00', '2025-01-24 18:40:28.570237+00', NULL, '91b6c5d3-5d60-4f03-9846-de6cfa32437b');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: key; Type: TABLE DATA; Schema: pgsodium; Owner: supabase_admin
--



--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."organizations" ("id", "name", "contact_info", "settings", "created_by", "created_at", "slug") VALUES
	('80997576-d610-4185-969b-ccef10b2aed6', 'smitchco', '{"email": "smnewman07+11@gmail.com"}', '{}', '82f0d568-7c30-42a3-b787-4557e81f93e7', '2025-01-24 18:39:29.894862+00', 'smith');


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."audit_logs" ("event_id", "organization_id", "timestamp", "actor_id", "actor_type", "ip_address", "user_agent", "action_type", "action_description", "action_meta", "resource_type", "resource_id", "related_resources", "details_before", "details_after", "ai_metadata", "session_id", "request_id", "client_info", "duration_ms", "severity", "status", "error_code", "error_message", "created_at") VALUES
	('27705fdc-0309-4a5a-997b-17e1a258c718', '80997576-d610-4185-969b-ccef10b2aed6', '2025-01-24 18:39:29.984529+00', '82f0d568-7c30-42a3-b787-4557e81f93e7', 'employee', '172.19.0.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', 'create', 'New organization created during registration', '{"org_name": "smitchco", "created_by": "82f0d568-7c30-42a3-b787-4557e81f93e7"}', 'organization', '80997576-d610-4185-969b-ccef10b2aed6', '[]', NULL, NULL, NULL, NULL, NULL, '{"ip": "172.19.0.1", "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"}', 6, 'info', 'success', NULL, NULL, '2025-01-24 18:39:29.984529+00'),
	('f11fee9f-725f-4d29-8dc4-272026ff3cb0', '80997576-d610-4185-969b-ccef10b2aed6', '2025-01-24 18:39:30.148532+00', '82f0d568-7c30-42a3-b787-4557e81f93e7', 'employee', '172.19.0.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', 'create', 'New root employee registered', '{"user_email": "smnewman07+11@gmail.com", "is_root_user": true}', 'employee', '98516d7c-c740-45bb-b779-da8c2dfffe7d', '[]', NULL, NULL, NULL, NULL, NULL, '{"ip": "172.19.0.1", "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"}', 20, 'info', 'success', NULL, NULL, '2025-01-24 18:39:30.148532+00'),
	('b6238cac-bd8d-489c-bb10-a957ebe499fa', '80997576-d610-4185-969b-ccef10b2aed6', '2025-01-24 18:39:57.757233+00', '82f0d568-7c30-42a3-b787-4557e81f93e7', 'employee', '172.19.0.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', 'execute', 'User logged out', '{"email": "smnewman07+11@gmail.com"}', 'system', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{"ip": "172.19.0.1", "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"}', NULL, 'info', 'success', NULL, NULL, '2025-01-24 18:39:57.757233+00');


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customers" ("id", "organization_id", "name", "email", "contact_info", "status", "created_at", "last_login_at") VALUES
	('d5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', '80997576-d610-4185-969b-ccef10b2aed6', 'smnewman07+1er1', 'smnewman07+1er1@gmail.com', '{}', 'pending_verification', '2025-01-24 18:40:28.422094+00', NULL);


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."employees" ("id", "user_id", "organization_id", "role", "is_root_admin", "name", "email", "status", "skills", "created_at", "last_login_at", "first_name", "last_name") VALUES
	('98516d7c-c740-45bb-b779-da8c2dfffe7d', '82f0d568-7c30-42a3-b787-4557e81f93e7', '80997576-d610-4185-969b-ccef10b2aed6', 'admin', true, NULL, 'smnewman07+11@gmail.com', 'active', '[]', '2025-01-24 18:39:29.894862+00', NULL, NULL, NULL);


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "user_id", "display_name", "avatar_url", "bio", "created_at", "updated_at") VALUES
	('e764bb0f-f77e-4fea-b00d-890f13e1f48b', '82f0d568-7c30-42a3-b787-4557e81f93e7', 'smnewman07+11@gmail.com', NULL, NULL, '2025-01-24 18:39:29.817888+00', '2025-01-24 18:39:29.817888+00'),
	('41344c6f-c261-4bea-abd5-58d7214c81f2', '8be2871a-4f09-4465-9d46-b4a0acf4079e', 'smnewman07+1er1@gmail.com', NULL, NULL, '2025-01-24 18:40:28.304552+00', '2025-01-24 18:40:28.304552+00');


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tickets" ("id", "organization_id", "customer_id", "assigned_to", "title", "description", "status", "priority", "category", "source", "due_date", "created_at", "updated_at", "resolved_at", "resolved_by", "satisfaction_rating") VALUES
	('2897a000-a999-429b-9aaf-e8cd3f7c5898', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'I would like to try the resources', 'I would like to try the resources', 'open', 'medium', NULL, NULL, NULL, '2025-01-24 18:40:28.431249+00', '2025-01-24 18:40:28.431249+00', NULL, NULL, NULL),
	('e42b29c9-7b30-4ba0-8ce8-d3b0ca0ba1c9', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Login Authentication Issue', 'User unable to access dashboard after password reset', 'open', 'high', 'Authentication', 'Email', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('f485c5fc-9a12-4a8a-b49b-27ab0c3edf27', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Data Export Not Working', 'Export to CSV feature throwing 500 error', 'open', 'high', 'Bug', 'API Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('5938dd3f-3c3c-4576-aaba-f8ab072900ed', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Mobile App Crash on Startup', 'iOS app crashes immediately after splash screen', 'open', 'high', 'Mobile App', 'Crash Report', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('62dfb4db-8415-482c-892e-add8b2085fc2', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Payment Processing Delay', 'Customer payments taking longer than usual to process', 'in_progress', 'high', 'Billing', 'Email', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('c4b6f337-0fb3-40fb-8243-0287ff0312c8', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Account Verification Issue', 'Email verification links not working for new signups', 'open', 'medium', 'Authentication', 'Support Portal', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('0b939558-31c5-4515-ab5a-a975858bf58e', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'API Rate Limiting', 'Hitting rate limits too frequently on standard plan', 'in_progress', 'medium', 'API', 'API Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('b112c8f1-96e5-4955-9b16-b1548ec40dd7', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Dashboard Loading Slow', 'Performance issues with analytics dashboard', 'open', 'medium', 'Performance', 'Live Chat', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('3356e3f0-7b49-484b-81f6-ee99ba34c2ef', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Custom Integration Failed', 'Webhook integration failing for Salesforce sync', 'in_progress', 'high', 'Integration', 'Email', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('dda73f51-38a3-4f40-ae52-76022b14df9d', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'SSO Configuration Error', 'Unable to set up SAML SSO with Okta', 'open', 'medium', 'Authentication', 'Support Portal', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('115925b8-7ba2-4dfa-aec0-15aad3171e23', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Data Export Timeout', 'Large data exports failing to complete', 'in_progress', 'medium', 'Performance', 'Support Portal', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('b416dad1-e9bc-4144-b3a3-49738953d575', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Database Replication Lag', 'Read replicas showing increased lag time', 'open', 'high', 'Infrastructure', 'Monitoring Alert', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('283500e9-03f8-4cf8-a8f0-443ce42325be', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Password Reset Email Delay', 'Users reporting 10+ minute delays for reset emails', 'in_progress', 'medium', 'Email', 'Support Portal', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('ada03061-3b4e-4e48-8b98-05834b74786b', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Search Indexing Failed', 'Product search not updating with new items', 'resolved', 'high', 'Search', 'Internal Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('be24f0ab-39d6-4f99-8e1a-04fb2c4872a6', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'API Documentation Error', 'Incorrect endpoint parameters listed', 'resolved', 'low', 'Documentation', 'Customer Feedback', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('ec77f058-51b2-4df8-9f03-df3196976137', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'CDN Cache Issues', 'Static assets not updating after deploy', 'resolved', 'medium', 'Infrastructure', 'DevOps Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('c7c153d6-0d15-4cba-bdb3-95113f3fdc7b', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'OAuth Integration Failure', 'Google SSO login flow broken', 'in_progress', 'high', 'Authentication', 'Error Logs', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('0c300b0c-5db1-4139-9f63-7103a1310320', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Payment Gateway Timeout', 'Stripe webhook responses delayed', 'resolved', 'high', 'Payments', 'Payment Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('31500a9d-8d27-4eba-a765-bcd369115234', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Mobile Push Notifications', 'Android notifications not delivering', 'in_progress', 'medium', 'Mobile', 'App Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('bb18b0b1-f708-477d-bb5a-d798f2a3e6b5', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Report Generation Failed', 'Weekly analytics reports not sending', 'resolved', 'medium', 'Analytics', 'Automated Alert', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('cf95f4ae-61eb-41dc-8e3f-2f5a178e4357', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Rate Limit Exceeded', 'Multiple enterprise customers hitting limits', 'open', 'high', 'API', 'System Alert', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('86c0cb11-b219-4efc-8429-1d3ba172f8f7', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Data Migration Stuck', 'Legacy data import process halted', 'in_progress', 'medium', 'Data', 'Migration Tool', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('39667e84-19c6-4aa7-8f4a-685eb5645953', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'SSL Certificate Expiring', 'Production certificate expires in 48h', 'resolved', 'high', 'Security', 'Security Scan', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('7e69ed63-21d0-4326-8b12-50e579a9248a', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Memory Leak Investigation', 'Production servers showing increased memory usage', 'open', 'high', 'Infrastructure', 'Monitoring', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('cbabe361-4645-41b8-8611-5f499e0ba211', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'User Session Sync Issues', 'Multiple sessions not syncing properly', 'in_progress', 'medium', 'Authentication', 'Support Portal', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('fa5e28a6-805b-4653-834e-d28be3eb8f7c', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Database Backup Failure', 'Nightly backup job failed to complete', 'resolved', 'high', 'Database', 'Automated Alert', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('3b66a6af-746f-4e3e-afb0-cadbf62439d8', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'API Rate Limit Increase', 'Customer requesting higher API limits', 'open', 'low', 'API', 'Email', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('7bae673c-6309-4675-a5a5-9ca981f09cd2', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Mobile App Crash Reports', 'Spike in crash reports after latest release', 'open', 'high', 'Mobile', 'Crash Reporter', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('ef2b0f38-9231-4594-9f67-d86935903aaf', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Payment Gateway Integration', 'New payment provider setup needed', 'in_progress', 'medium', 'Integration', 'Project Management', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('9fc0673e-02e3-47d9-8723-b6655f420d35', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Customer Data Export', 'GDPR data export request', 'open', 'high', 'Compliance', 'Legal', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('4dd3abda-75f0-4fab-82cf-3c882580aa26', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Search Index Optimization', 'Search results showing high latency', 'in_progress', 'medium', 'Performance', 'Performance Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('507c4a55-1aac-4e94-9e91-07d65d20cdb1', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'SSL Certificate Renewal', 'Multiple domains need certificate updates', 'resolved', 'high', 'Security', 'Security Scanner', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('ddb0e718-9364-4076-8cfe-859f2d0110d2', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Load Balancer Configuration', 'New region traffic routing setup', 'open', 'medium', 'Infrastructure', 'Infrastructure', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('90b0418b-7da4-43d5-aeb7-a44c76bca177', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Database Performance Tuning', 'Query optimization for customer dashboard', 'resolved', 'medium', 'Database', 'Performance Monitor', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('68021c04-ecf7-45f7-bc97-a018dc3d7b32', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'User Profile Image Upload', 'Image processing timeout on large files', 'resolved', 'medium', 'Frontend', 'Error Logs', '2024-01-28 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('6d657f92-f193-45c9-8467-c045ab68cb8f', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Email Template Rendering', 'HTML emails not displaying correctly in Outlook', 'open', 'low', 'Email', 'Customer Support', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('32c475cf-79ec-4a4e-842b-363cd2503ca6', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Redis Cache Invalidation', 'Stale data appearing in user dashboard', 'in_progress', 'high', 'Cache', 'System Monitor', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('d6dc830b-966b-4d09-af46-fcda6e469e92', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'GraphQL Query Timeout', 'Complex queries timing out in production', 'open', 'high', 'API', 'Performance Alert', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('b8868958-d0ed-42a7-93ed-d424854ee18f', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Webhook Delivery Failure', 'Failed webhook retries increasing', 'open', 'medium', 'Integration', 'System Alert', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('fdd371a9-8abc-4e35-809d-a8b157fb8dcb', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'PDF Generation Error', 'Invoice PDF generation failing', 'in_progress', 'high', 'Billing', 'Error Monitor', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('96605c57-74aa-44eb-a1bf-85496a7582c9', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Two-Factor Authentication', '2FA SMS codes not being received', 'open', 'high', 'Security', 'Support Ticket', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('1507de91-f9aa-443c-b1b4-bb73a850e651', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Data Visualization Bug', 'Charts not rendering in IE11', 'open', 'low', 'Frontend', 'Bug Report', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('15596a03-6d53-4091-9e3d-9881e4f2d451', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Kubernetes Pod Crash', 'Worker pods repeatedly crashing', 'open', 'high', 'Infrastructure', 'Kubernetes Alert', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('3891678b-abee-4339-a3bd-cb077c9024c3', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'File Upload Limit', 'Increase max file upload size request', 'open', 'low', 'Configuration', 'Feature Request', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('f61d11bb-e5c9-43f6-9099-e5bca17db13f', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Database Connection Pool', 'Connection pool exhaustion errors', 'in_progress', 'high', 'Database', 'Error Monitor', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('cf25dfba-d6f1-4832-9401-94109ebb4da7', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'API Version Deprecation', 'Notify users of v1 API sunset', 'open', 'medium', 'API', 'Project Task', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('51d7992f-d1d5-4822-9db5-bac35906bc6f', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Mobile Deep Linking', 'Deep links not working on Android', 'in_progress', 'medium', 'Mobile', 'Bug Report', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('53a78f26-da6a-4c81-abaf-00fc4e31c940', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Elasticsearch Reindex', 'Full reindex required for new mapping', 'open', 'medium', 'Search', 'Maintenance', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('4e189aae-413a-48c6-ab5b-64e91e562a21', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'CORS Configuration', 'CORS headers missing for new endpoint', 'resolved', 'medium', 'API', 'Security Scan', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('4ada760b-416d-4b5c-a830-4d6e7f48eb56', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'WebSocket Connection', 'Frequent WebSocket disconnections', 'in_progress', 'high', 'Networking', 'Error Logs', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('1404d520-1ba0-41ca-b71a-ab319b8b2294', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Audit Log Export', 'Audit log export timing out', 'open', 'medium', 'Compliance', 'Internal Request', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('1ea657db-2231-45db-850e-a709148d4973', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Jenkins Pipeline Failure', 'Production deployment pipeline stuck', 'open', 'high', 'DevOps', 'CI/CD Alert', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('608dd2af-76a7-44d6-927c-7e3945cc510f', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'React Component Error', 'Memory leak in dashboard component', 'in_progress', 'medium', 'Frontend', 'Performance Monitor', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('f53151df-18de-48ca-9240-76199008cb3f', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'DNS Propagation Issue', 'DNS changes not propagating to all regions', 'resolved', 'high', 'Infrastructure', 'Network Monitor', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('8e8d7e96-45e9-4b78-9fb3-98e47e141242', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Background Job Queue', 'Job queue processing delay', 'in_progress', 'medium', 'Backend', 'System Monitor', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('1e18968f-2efa-491b-af96-7c2ec9d41480', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'OAuth Token Refresh', 'Token refresh failing for Google integration', 'open', 'high', 'Authentication', 'Error Alert', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('c284a4a1-3278-4db9-afc5-7919c65284e9', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'CDN Edge Cache', 'Edge cache not invalidating properly', 'open', 'high', 'Infrastructure', 'CDN Monitor', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('f8ee8f8c-df03-4440-8a16-07e8fa79b2f9', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'GraphQL Schema Update', 'Breaking changes in GraphQL schema', 'in_progress', 'high', 'API', 'Development', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('ac9dbc29-b0e8-42e1-af79-a4ddf9dc26df', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Redis Cluster Failover', 'Redis primary node not failing over', 'open', 'high', 'Infrastructure', 'System Alert', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('8bc93a94-77b3-45ba-910e-b145495069b1', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'Stripe Webhook Security', 'Invalid webhook signatures detected', 'open', 'high', 'Security', 'Security Alert', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL),
	('25d9547e-1d47-4f5e-b6ad-be7db867ff88', '80997576-d610-4185-969b-ccef10b2aed6', 'd5ea866e-7a93-4a18-b7f8-7e0a0f4f8387', NULL, 'User Session Cleanup', 'Expired sessions not being cleared', 'in_progress', 'low', 'Maintenance', 'System Task', '2024-01-29 00:00:00+00', '2025-01-24 18:45:20.983591+00', '2025-01-24 18:45:20.983591+00', NULL, NULL, NULL);


--
-- Data for Name: ticket_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."ticket_messages" ("id", "ticket_id", "organization_id", "sender_id", "sender_type", "content", "responding_to_id", "origin", "is_private", "is_ai_generated", "metadata", "created_at", "updated_at", "deleted_at") VALUES
	('a48c5fd9-0da0-4236-a7ee-c570516494fb', '2897a000-a999-429b-9aaf-e8cd3f7c5898', '80997576-d610-4185-969b-ccef10b2aed6', NULL, 'customer', 'I would like to try the resources', NULL, 'ticket', false, false, '{}', '2025-01-24 18:40:28.437992+00', '2025-01-24 18:40:28.437992+00', NULL);


--
-- Data for Name: ticket_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 4, true);


--
-- Name: key_key_id_seq; Type: SEQUENCE SET; Schema: pgsodium; Owner: supabase_admin
--

SELECT pg_catalog.setval('"pgsodium"."key_key_id_seq"', 1, false);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
