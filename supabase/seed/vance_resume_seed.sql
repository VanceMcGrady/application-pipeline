-- One-time personal seed: populates roles, skills, achievements,
-- achievement_skills, and education from Vance's resume text.
--
-- NOT a schema migration -- do not put this in supabase/migrations/.
-- Run manually once (Supabase SQL Editor, or `psql ... -f` against a
-- service-role/postgres connection) after 0001_experience_ledger.sql
-- has been applied. Requires read access to auth.users, so run it as
-- postgres/service_role, not as an RLS-scoped `authenticated` session.
--
-- Flags for review (see chat for full list):
--   - Dates use the 1st of the stated month (resume only gives month/year).
--   - All metrics carry confidence: "resume-stated" -- self-reported,
--     not yet independently verified per CLAUDE.md principle 2.
--   - sensitivity defaults to 'public' since this is already public
--     resume content.
--   - Virga Labs bullets 1 and 4 disagree on project count (180+ vs
--     22,000+) -- left as-is from the source text; reconcile manually.
--   - Education row has no field-of-study; resume only said "BA".

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'vancemcgrady@gmail.com';

  if v_user_id is null then
    raise exception 'No auth.users row found for vancemcgrady@gmail.com -- create the account first';
  end if;

  -- ===================== ROLES =====================
  insert into roles (id, user_id, company, title, start_date, end_date, location, one_line_summary) values
    ('67edb059-5db7-4a40-b1eb-5b119150d510', v_user_id, 'DataAnnotation', 'AI Training Specialist (Software Engineering)', '2026-04-01', null, null, 'AI training data specialist authoring and evaluating coding prompts and model responses across multiple languages.'),
    ('d5895633-8774-4244-9469-d3b4f243c588', v_user_id, 'Lotus Wei', 'Software Consultant', '2026-04-01', null, null, 'Consultant architecting and owning an internal tools dashboard used across a 50-person operations/fulfillment/support team.'),
    ('a9a06898-0fd1-4bf9-a305-41c123a6952b', v_user_id, 'Basata Inc.', 'Software Engineer', '2025-08-01', '2026-04-01', null, 'Engineer building a multi-tenant, configuration-driven platform across React, Spring Boot, and Python.'),
    ('1127450c-b9fe-46c8-ab5d-cfc2c7366be1', v_user_id, 'EdPlus', 'Software Engineer', '2025-06-01', '2025-08-01', null, 'Engineer leading front-end architecture for high-traffic public university websites using Vue/Nuxt/Jamstack.'),
    ('d799f603-acdf-4c26-9ace-757ba02d1277', v_user_id, 'City of Chandler', 'Senior Database Engineer', '2024-08-01', '2025-02-01', null, 'Senior database engineer modernizing a municipal Angular application and optimizing SQL Server infrastructure.'),
    ('d8387d8c-d6e1-4d10-b0d7-ca96d42d1e2a', v_user_id, 'Virga Labs', 'Software Engineer', '2023-05-01', '2024-06-01', null, 'Engineer building a federal-funding tracking platform in Next.js/Python/Supabase serving thousands of monthly users.'),
    ('9ee4c03b-53f2-4bb8-8ba7-7a51bc7868bc', v_user_id, 'Codesmith', 'Software Engineer', '2022-10-01', '2023-01-01', null, 'Engineer on a public bidirectional collaborative IDE and internal tools built with React/Redux/Node/Express.'),
    ('466499f6-9276-4bb8-b503-156ddd68993c', v_user_id, 'Herbert Walker LLC.', 'Web Developer', '2020-05-01', '2022-06-01', null, 'Web developer designing and maintaining custom client websites and applications.');

  -- ===================== SKILLS =====================
  insert into skills (id, user_id, name, category) values
    ('6d8218d8-766d-4c1c-bc96-a8bd35d21e1d', v_user_id, 'JavaScript (ES6)', 'language'),
    ('d650bb19-18e0-4d66-8206-6ae5b2ac21a3', v_user_id, 'R', 'language'),
    ('61af63eb-adfc-4a26-95c6-5aac4c60f02f', v_user_id, 'Python', 'language'),
    ('3890470f-b5e3-462e-9f38-1a466b7ab6e7', v_user_id, 'TypeScript', 'language'),
    ('389eae65-987b-4091-b52b-649520577e60', v_user_id, 'Next.js', 'framework'),
    ('70cd5be9-ec6c-4af8-a982-d40deaab81bd', v_user_id, 'Svelte', 'framework'),
    ('e2a89627-0bcd-46fd-b10c-b2f9becac6fb', v_user_id, 'React', 'framework'),
    ('f5826bbe-3fd3-4f91-8e97-82d5bb953114', v_user_id, 'Angular', 'framework'),
    ('801b50cb-071d-40da-97dc-af7737666bb5', v_user_id, 'R Shiny', 'framework'),
    ('8c0c52e3-917a-4ce8-8d21-dfa7103817eb', v_user_id, 'Vite', 'tooling'),
    ('f597166e-7fd2-4bb8-b9b5-3a61de485f7c', v_user_id, 'Node.js', 'runtime'),
    ('5c035fd3-88f7-47a8-b241-cbaf44103a13', v_user_id, 'Express.js', 'framework'),
    ('e17e134c-fe63-494b-8ecf-99feb7c89bf9', v_user_id, 'REST APIs', 'practice'),
    ('02d0b5e3-866c-47da-8873-a9827da6411b', v_user_id, 'HTML5', 'language'),
    ('9e18d344-646c-4d51-88cf-a069e6228a0a', v_user_id, 'CSS3', 'language'),
    ('dd190ea2-9783-4c79-9113-604f8266fa16', v_user_id, 'SQL', 'language'),
    ('4d3ee19d-dbe7-4258-b7e5-c92ae28ee11f', v_user_id, 'PostgreSQL', 'database'),
    ('a573bcef-fb67-40dd-badb-e3ce7a5f2286', v_user_id, 'Oracle Databases', 'database'),
    ('6620d72d-bb8d-4ac8-8570-122ac5dd81c5', v_user_id, 'Microsoft Server Management Studio', 'tooling'),
    ('62718c31-c298-47b8-b207-b0a0d78482eb', v_user_id, 'Redis', 'database'),
    ('d737de6b-0183-49d9-b86c-27fa834e6394', v_user_id, 'Vercel', 'cloud'),
    ('0dfebd9b-972d-497f-9293-0741e631f123', v_user_id, 'Git', 'tooling'),
    ('c5d364c2-87f2-477a-8204-e84cc422c577', v_user_id, 'GitHub', 'tooling'),
    ('b44ba077-d3b1-4aad-aeae-b19e9a9cec55', v_user_id, 'GitHub Actions', 'tooling'),
    ('806f292f-1aad-495b-bcc1-89c26f923324', v_user_id, 'Subversion', 'tooling'),
    ('1ac27b56-0a42-4bae-8739-ececb04ad8a4', v_user_id, 'UI/UX Best Practices', 'practice'),
    ('32902407-2dc4-42bc-9f1d-24a242df822f', v_user_id, 'Docker', 'cloud'),
    ('1a042283-0a62-4744-82c1-5d90e478ce03', v_user_id, 'AWS', 'cloud'),
    ('9e828e25-daa9-46ec-a36b-799f82e619f9', v_user_id, 'Azure', 'cloud'),
    ('bcbbcc7e-5df5-464e-8627-447245f38d3c', v_user_id, 'Jest', 'tooling'),
    ('c7cabc57-2149-4d0e-a224-064e90f82698', v_user_id, 'Spring Boot', 'framework'),
    ('1bbd77fb-fae4-4699-92bc-0193e69bbd00', v_user_id, 'Java', 'language'),
    ('9f6b2bb4-8c43-4b75-b3d9-ff5ee140ab22', v_user_id, 'Vue', 'framework'),
    ('4fe954cd-9e4a-49e4-9ce2-ebb728b55672', v_user_id, 'Nuxt', 'framework'),
    ('10bba330-30df-450a-99d3-c873c8adb578', v_user_id, 'Jamstack', 'practice'),
    ('1f3dba3c-7f04-4ab6-b927-caf171c91d89', v_user_id, 'GraphQL', 'api'),
    ('adfa0164-0015-4ef1-a4ec-16dd22063bcb', v_user_id, 'Flask', 'framework'),
    ('62646dc5-b0d7-4c80-bb91-30850ded9a6c', v_user_id, 'Supabase', 'database'),
    ('c64454e1-c3ab-47da-a1a0-69037084addd', v_user_id, 'Redux', 'framework'),
    ('c8d2d725-9dd6-46b5-ba65-b8874438c1be', v_user_id, 'Enzyme', 'tooling'),
    ('e13242a8-83bf-423a-99df-f80fe3c58cac', v_user_id, 'Microsoft SQL Server', 'database');

  -- ===================== ACHIEVEMENTS =====================

  -- DataAnnotation
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('32a9e424-f7ee-4ace-8976-55defec534ee', v_user_id, '67edb059-5db7-4a40-b1eb-5b119150d510', 'Authored coding prompts and model responses across languages', 'Authored and reviewed complex coding prompts and model responses across Python, JavaScript, TypeScript, and SQL, producing high-quality training data that improved LLM performance on real-world software engineering tasks.', '[]', array['ai-training','content-authoring','code-review'], null, 'public', current_date),
    ('ae0c2058-ac36-4af7-a9a9-2880fc6a482c', v_user_id, '67edb059-5db7-4a40-b1eb-5b119150d510', 'Evaluated and ranked model-generated code quality', 'Evaluated and ranked model-generated code for correctness, efficiency, and adherence to best practices, writing detailed rationales and corrected reference solutions to sharpen model reasoning on debugging, refactoring, and algorithmic problems.', '[]', array['ai-training','code-review','debugging','algorithms'], null, 'public', current_date),
    ('dac62d8d-d1ee-409b-815e-ea1b25bde802', v_user_id, '67edb059-5db7-4a40-b1eb-5b119150d510', 'Designed adversarial and edge-case test scenarios', 'Designed adversarial and edge-case test scenarios spanning full-stack development, API design, and data structures, exposing model failure modes and strengthening reliability on multi-step engineering workflows.', '[]', array['ai-training','testing','api-design','full-stack'], null, 'public', current_date),
    ('3f7c5eaf-4252-471a-9d5b-cdc67a255b0a', v_user_id, '67edb059-5db7-4a40-b1eb-5b119150d510', 'Refined annotation rubrics with quality/research teams', 'Collaborated with quality and research teams to refine annotation rubrics and grading standards, ensuring consistent, high-signal feedback that directly informed model fine-tuning and evaluation pipelines.', '[]', array['ai-training','collaboration','process-improvement'], null, 'public', current_date);

  -- Lotus Wei
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('b9f4ef06-8f4a-4cd1-a6be-ef43f529601d', v_user_id, 'd5895633-8774-4244-9469-d3b4f243c588', 'Architected internal tools dashboard for 50-person team', 'Designed and maintained the architecture for the company''s internal tools dashboard in Next.js, consolidating previously fragmented workflows into a single platform used by a team of 50 across operations, fulfillment, and customer support.', '[{"value":50,"unit":"people","label":"team size using consolidated dashboard","confidence":"resume-stated"}]', array['frontend','architecture','internal-tools'], 'Transcribed directly from resume text; not yet independently verified.', 'public', current_date),
    ('f096dcf9-df8e-4dc4-b630-3d963fd96c6e', v_user_id, 'd5895633-8774-4244-9469-d3b4f243c588', 'Established front-end architectural patterns', 'Established front-end architectural patterns -- including server components, route-level data fetching, and a typed API layer.', '[]', array['frontend','architecture'], null, 'public', current_date),
    ('fcc479a3-0158-4618-b569-061eaa14a40a', v_user_id, 'd5895633-8774-4244-9469-d3b4f243c588', 'Led end-to-end stack implementation with role-based access control', 'Led end-to-end implementation across the stack: Next.js App Router on the front end, Node/TypeScript API on the back end, and Postgres for persistence, with role-based access control for sensitive operational data.', '[]', array['full-stack','security','access-control'], null, 'public', current_date),
    ('cc86ff7b-5f49-4893-9233-f27dd2e19789', v_user_id, 'd5895633-8774-4244-9469-d3b4f243c588', 'Owned full development lifecycle for the dashboard', 'Owned the full development lifecycle for the dashboard -- code review standards, CI/CD pipelines, observability, and on-call.', '[]', array['leadership','ci-cd','observability','on-call'], null, 'public', current_date);

  -- Basata Inc.
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('241efcf5-3c67-40a5-999d-e7c4ba802fe5', v_user_id, 'a9a06898-0fd1-4bf9-a305-41c123a6952b', 'Architected multi-tenant configuration-driven platform', 'Architected and evolved a scalable, multi-tenant, configuration-driven platform using React, Spring Boot, and Python, enabling rapid feature delivery across customers without code forks.', '[]', array['architecture','multi-tenant','platform'], null, 'public', current_date),
    ('da98dc88-d857-427a-a0c2-7b9b6464c7e3', v_user_id, 'a9a06898-0fd1-4bf9-a305-41c123a6952b', 'Designed RESTful endpoints in Java Spring Boot API', 'Designed and implemented RESTful endpoints in a Java Spring Boot API to support new front-end feature requirements, owning the full stack from database schema design and query optimization through service-layer logic and API contract definition, ensuring performant, tenant-aware data access and clean integration boundaries.', '[]', array['backend','api-design','database','multi-tenant'], null, 'public', current_date),
    ('1b7d2af2-23e2-433a-b29b-e2d5e50b96bf', v_user_id, 'a9a06898-0fd1-4bf9-a305-41c123a6952b', 'Refactored legacy code for modularity and performance', 'Refactored legacy code in a high-growth startup environment to improve modularity, maintainability, and performance, positioning the system to support increased customer load and feature complexity.', '[]', array['refactoring','performance'], null, 'public', current_date),
    ('a7f44ca9-6c30-49a6-8266-619f9358dbac', v_user_id, 'a9a06898-0fd1-4bf9-a305-41c123a6952b', 'Defined front-end architecture for scaling AI product', 'Defined and implemented the front-end architecture for a rapidly scaling AI product, prioritizing responsiveness, rendering performance, and predictable state management under heavy data workflows.', '[]', array['frontend','architecture','performance'], null, 'public', current_date),
    ('889f55a8-110a-46fa-86cd-f59785eebf90', v_user_id, 'a9a06898-0fd1-4bf9-a305-41c123a6952b', 'Integrated Redis as tenant-aware caching/session layer', 'Integrated Redis as a caching and session layer to reduce database load and improve API response times, implementing tenant-aware cache invalidation strategies to maintain data consistency across the multi-tenant platform.', '[]', array['performance','caching','multi-tenant'], null, 'public', current_date);

  -- EdPlus
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('af10481b-1cc5-4368-a40d-64044af722c4', v_user_id, '1127450c-b9fe-46c8-ab5d-cfc2c7366be1', 'Spearheaded front-end architecture for university websites', 'Spearheaded front-end architecture for high-traffic, public-facing websites using Vue, Nuxt, and Jamstack, improving performance and accessibility across university-wide digital properties.', '[]', array['frontend','architecture','accessibility','performance'], null, 'public', current_date),
    ('6345c9d8-7b26-4531-ac0e-d15613fac19e', v_user_id, '1127450c-b9fe-46c8-ab5d-cfc2c7366be1', 'Translated institutional requirements into scalable components', 'Collaborated with designers, marketers, and product stakeholders to translate complex institutional requirements into scalable web components, increasing development velocity and reducing design-debt across teams.', '[]', array['collaboration','frontend','process-improvement'], null, 'public', current_date),
    ('407116fe-bc00-43b3-ab80-39e82b3c5f5d', v_user_id, '1127450c-b9fe-46c8-ab5d-cfc2c7366be1', 'Integrated GraphQL APIs to optimize data fetching', 'Integrated GraphQL APIs to optimize data fetching and reduce over-fetching, streamlining performance and developer experience.', '[]', array['api-design','performance'], null, 'public', current_date),
    ('4ae3a851-a422-417c-9da5-c07f5eef7971', v_user_id, '1127450c-b9fe-46c8-ab5d-cfc2c7366be1', 'Led code quality and documentation initiatives', 'Led initiatives to improve code quality and maintainability, introducing internal documentation standards and modular design patterns for reusable components.', '[]', array['leadership','process-improvement','frontend'], null, 'public', current_date);

  -- City of Chandler
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('5dfc2e1d-4b73-44e6-bff7-90b9fce48d5c', v_user_id, 'd799f603-acdf-4c26-9ace-757ba02d1277', 'Developed and optimized Angular 18 application', 'Developed and optimized a modern, scalable Angular 18 application, designing reusable services and HTTP interceptors to streamline API integration, enhance performance, and enforce security best practices.', '[]', array['frontend','architecture','security'], null, 'public', current_date),
    ('cd93ba52-973f-4ff6-8067-664c9358e25e', v_user_id, 'd799f603-acdf-4c26-9ace-757ba02d1277', 'Architected and maintained Microsoft SQL database', 'Architected and maintained a robust Microsoft SQL database, designing and executing seamless data migration strategies, defining core business logic through efficient stored procedures, and optimizing database performance for scalability and reliability.', '[]', array['database','migration','performance'], null, 'public', current_date),
    ('015de0d5-7a9c-4998-aa9a-bbf40175b308', v_user_id, 'd799f603-acdf-4c26-9ace-757ba02d1277', 'Engineered modern Node.js/TypeScript API', 'Engineered a modern API using Node.js and TypeScript, implementing efficient routing, authentication, and request validation to support scalable, secure, and high-performance microservices architecture.', '[]', array['backend','api-design','security','microservices'], null, 'public', current_date),
    ('33c2ac3e-8792-4674-bb2a-e290d266eb58', v_user_id, 'd799f603-acdf-4c26-9ace-757ba02d1277', 'Municipal database optimization project', 'Spearheaded a comprehensive database optimization project for the municipal infrastructure, resulting in a 50% increase in query performance and a 25% reduction in storage requirements by utilizing advanced indexing strategies and partitioning techniques.', '[{"value":50,"unit":"percent","label":"query performance increase","confidence":"resume-stated"},{"value":25,"unit":"percent","label":"storage requirement reduction","confidence":"resume-stated"}]', array['database','performance','optimization'], 'Transcribed directly from resume text; not yet independently verified.', 'public', current_date);

  -- Virga Labs
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('ab0b4a0d-8373-4a86-9dcf-77f6a1ddae30', v_user_id, 'd8387d8c-d6e1-4d10-b0d7-ca96d42d1e2a', 'Built Next.js app tracking $2.4B in federal funding', 'Utilized Next.js to architect and develop a high-performance web application that reduced page load times by 65% while tracking $2.4B in federal funding across 180+ conservation projects within the Colorado River Basin, increasing stakeholder data access by 40% and supporting 3,000+ monthly active users.', '[{"value":65,"unit":"percent","label":"page load time reduction","confidence":"resume-stated"},{"value":2.4,"unit":"USD billions","label":"federal funding tracked","confidence":"resume-stated"},{"value":180,"unit":"count (min)","label":"conservation projects tracked","confidence":"resume-stated"},{"value":40,"unit":"percent","label":"increase in stakeholder data access","confidence":"resume-stated"},{"value":3000,"unit":"count (min)","label":"monthly active users supported","confidence":"resume-stated"}]', array['frontend','performance','data-platform'], 'Transcribed directly from resume text; not yet independently verified. NOTE: project count here (180+) conflicts with the 22,000+ figure in the Supabase/PostgreSQL bullet -- reconcile before citing both.', 'public', current_date),
    ('cc7bead3-b239-4bc3-b065-d39f9214cf95', v_user_id, 'd8387d8c-d6e1-4d10-b0d7-ca96d42d1e2a', 'Adopted Vercel to cut deployment time 91%', 'Spearheaded the adoption of Vercel for streamlined application deployments, reducing deployment times from 45 minutes to under 4 minutes (91% improvement) and optimizing CI/CD pipelines, resulting in $35,000 annual infrastructure cost savings while increasing development team velocity by 28%.', '[{"value":45,"unit":"minutes","label":"prior deployment time","confidence":"resume-stated"},{"value":4,"unit":"minutes (max)","label":"new deployment time","confidence":"resume-stated"},{"value":91,"unit":"percent","label":"deployment time improvement","confidence":"resume-stated"},{"value":35000,"unit":"USD/year","label":"infrastructure cost savings","confidence":"resume-stated"},{"value":28,"unit":"percent","label":"dev team velocity increase","confidence":"resume-stated"}]', array['ci-cd','deployment','cost-savings'], 'Transcribed directly from resume text; not yet independently verified.', 'public', current_date),
    ('3f7be971-1e74-4607-8299-7f7a7d7bedc6', v_user_id, 'd8387d8c-d6e1-4d10-b0d7-ca96d42d1e2a', 'Built Flask API handling 2.5M+ monthly requests', 'Leveraged Python and Flask to architect a RESTful API handling 2.5M+ monthly requests with 99.97% uptime, reducing data transfer latency by 72% and supporting 15,000+ concurrent users across web and mobile platforms while decreasing server response time by 67%.', '[{"value":2500000,"unit":"requests/month (min)","label":"monthly API requests handled","confidence":"resume-stated"},{"value":99.97,"unit":"percent","label":"uptime","confidence":"resume-stated"},{"value":72,"unit":"percent","label":"data transfer latency reduction","confidence":"resume-stated"},{"value":15000,"unit":"count (min)","label":"concurrent users supported","confidence":"resume-stated"},{"value":67,"unit":"percent","label":"server response time decrease","confidence":"resume-stated"}]', array['backend','api-design','performance'], 'Transcribed directly from resume text; not yet independently verified.', 'public', current_date),
    ('b6421eea-a6f8-46e0-bf49-40e921ed0517', v_user_id, 'd8387d8c-d6e1-4d10-b0d7-ca96d42d1e2a', 'Implemented Supabase/PostgreSQL managing 8TB of project data', 'Implemented Supabase alongside PostgreSQL to architect a data storage solution that efficiently managed 8TB of project data with 99.99% reliability, reducing query times by 75% while scaling to support 22,000+ conservation projects and processing 120,000+ daily transactions with zero data integrity issues.', '[{"value":8,"unit":"TB","label":"project data managed","confidence":"resume-stated"},{"value":99.99,"unit":"percent","label":"reliability","confidence":"resume-stated"},{"value":75,"unit":"percent","label":"query time reduction","confidence":"resume-stated"},{"value":22000,"unit":"count (min)","label":"conservation projects supported","confidence":"resume-stated"},{"value":120000,"unit":"transactions/day (min)","label":"daily transactions processed","confidence":"resume-stated"}]', array['database','reliability','scale'], 'Transcribed directly from resume text; not yet independently verified. NOTE: project count here (22,000+) conflicts with the 180+ figure in the Next.js bullet -- reconcile before citing both.', 'public', current_date);

  -- Codesmith
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('062e0392-7c73-4f76-a6f8-bc9610700e96', v_user_id, '9ee4c03b-53f2-4bb8-8ba7-7a51bc7868bc', 'Built collaborative IDE platform and internal tools', 'Developed and maintained a public web application, bidirectional collaborative IDE platform, and internal tools built with React, Redux, Node, and Express.', '[]', array['full-stack','collaboration-tools'], null, 'public', current_date),
    ('f5539daa-1d86-407f-bc80-2ab57cb98e3c', v_user_id, '9ee4c03b-53f2-4bb8-8ba7-7a51bc7868bc', 'Built curriculum component for public education platform', 'Used React to create a new curriculum component on a public education platform by leveraging React''s innate component reusability and intuitive DOM manipulation to contribute readable, modular code to an enterprise-scale web application.', '[]', array['frontend'], null, 'public', current_date),
    ('46631b60-034f-4a22-bbd8-31d4446d0c1c', v_user_id, '9ee4c03b-53f2-4bb8-8ba7-7a51bc7868bc', 'Increased test coverage with Enzyme and Jest', 'Increased test coverage of the codebase by utilizing Enzyme and Jest to conduct unit tests for React, Redux, and Express to ensure proper rendering of components and controller outputs during authentication to enhance platform reliability, and facilitate continuous development and integration.', '[]', array['testing','reliability'], null, 'public', current_date);

  -- Herbert Walker LLC.
  insert into achievements (id, user_id, role_id, title, description, metrics, scope_tags, verification_note, sensitivity, last_reviewed) values
    ('89a832ad-f77e-4eda-a717-1647d4d22142', v_user_id, '466499f6-9276-4bb8-b503-156ddd68993c', 'Designed and maintained custom client websites', 'Designed, built, and maintained custom websites as well as software applications and performed website updates by deploying CSS, HTML, JavaScript, and React, providing a product with best design practices, and flawless UX.', '[]', array['frontend','client-work'], null, 'public', current_date),
    ('98421c97-e843-46e5-a301-95e6ae4c94b6', v_user_id, '466499f6-9276-4bb8-b503-156ddd68993c', 'Implemented SEO best practices', 'Implemented SEO best practices and optimized website content, meta tags, and alt tags for improved search engine visibility and higher rankings.', '[]', array['seo','frontend'], null, 'public', current_date);

  -- ===================== ACHIEVEMENT <-> SKILLS =====================
  insert into achievement_skills (user_id, achievement_id, skill_id) values
    -- DataAnnotation
    (v_user_id, '32a9e424-f7ee-4ace-8976-55defec534ee', '61af63eb-adfc-4a26-95c6-5aac4c60f02f'), -- Python
    (v_user_id, '32a9e424-f7ee-4ace-8976-55defec534ee', '6d8218d8-766d-4c1c-bc96-a8bd35d21e1d'), -- JavaScript
    (v_user_id, '32a9e424-f7ee-4ace-8976-55defec534ee', '3890470f-b5e3-462e-9f38-1a466b7ab6e7'), -- TypeScript
    (v_user_id, '32a9e424-f7ee-4ace-8976-55defec534ee', 'dd190ea2-9783-4c79-9113-604f8266fa16'), -- SQL
    (v_user_id, 'dac62d8d-d1ee-409b-815e-ea1b25bde802', 'e17e134c-fe63-494b-8ecf-99feb7c89bf9'), -- REST APIs

    -- Lotus Wei
    (v_user_id, 'b9f4ef06-8f4a-4cd1-a6be-ef43f529601d', '389eae65-987b-4091-b52b-649520577e60'), -- Next.js
    (v_user_id, 'f096dcf9-df8e-4dc4-b630-3d963fd96c6e', '389eae65-987b-4091-b52b-649520577e60'), -- Next.js
    (v_user_id, 'f096dcf9-df8e-4dc4-b630-3d963fd96c6e', '3890470f-b5e3-462e-9f38-1a466b7ab6e7'), -- TypeScript
    (v_user_id, 'fcc479a3-0158-4618-b569-061eaa14a40a', '389eae65-987b-4091-b52b-649520577e60'), -- Next.js
    (v_user_id, 'fcc479a3-0158-4618-b569-061eaa14a40a', 'f597166e-7fd2-4bb8-b9b5-3a61de485f7c'), -- Node.js
    (v_user_id, 'fcc479a3-0158-4618-b569-061eaa14a40a', '3890470f-b5e3-462e-9f38-1a466b7ab6e7'), -- TypeScript
    (v_user_id, 'fcc479a3-0158-4618-b569-061eaa14a40a', '4d3ee19d-dbe7-4258-b7e5-c92ae28ee11f'), -- PostgreSQL
    (v_user_id, 'cc86ff7b-5f49-4893-9233-f27dd2e19789', 'b44ba077-d3b1-4aad-aeae-b19e9a9cec55'), -- GitHub Actions

    -- Basata Inc.
    (v_user_id, '241efcf5-3c67-40a5-999d-e7c4ba802fe5', 'e2a89627-0bcd-46fd-b10c-b2f9becac6fb'), -- React
    (v_user_id, '241efcf5-3c67-40a5-999d-e7c4ba802fe5', 'c7cabc57-2149-4d0e-a224-064e90f82698'), -- Spring Boot
    (v_user_id, '241efcf5-3c67-40a5-999d-e7c4ba802fe5', '61af63eb-adfc-4a26-95c6-5aac4c60f02f'), -- Python
    (v_user_id, 'da98dc88-d857-427a-a0c2-7b9b6464c7e3', '1bbd77fb-fae4-4699-92bc-0193e69bbd00'), -- Java
    (v_user_id, 'da98dc88-d857-427a-a0c2-7b9b6464c7e3', 'c7cabc57-2149-4d0e-a224-064e90f82698'), -- Spring Boot
    (v_user_id, 'da98dc88-d857-427a-a0c2-7b9b6464c7e3', 'dd190ea2-9783-4c79-9113-604f8266fa16'), -- SQL
    (v_user_id, 'da98dc88-d857-427a-a0c2-7b9b6464c7e3', 'e17e134c-fe63-494b-8ecf-99feb7c89bf9'), -- REST APIs
    (v_user_id, 'a7f44ca9-6c30-49a6-8266-619f9358dbac', 'e2a89627-0bcd-46fd-b10c-b2f9becac6fb'), -- React
    (v_user_id, '889f55a8-110a-46fa-86cd-f59785eebf90', '62718c31-c298-47b8-b207-b0a0d78482eb'), -- Redis

    -- EdPlus
    (v_user_id, 'af10481b-1cc5-4368-a40d-64044af722c4', '9f6b2bb4-8c43-4b75-b3d9-ff5ee140ab22'), -- Vue
    (v_user_id, 'af10481b-1cc5-4368-a40d-64044af722c4', '4fe954cd-9e4a-49e4-9ce2-ebb728b55672'), -- Nuxt
    (v_user_id, 'af10481b-1cc5-4368-a40d-64044af722c4', '10bba330-30df-450a-99d3-c873c8adb578'), -- Jamstack
    (v_user_id, '407116fe-bc00-43b3-ab80-39e82b3c5f5d', '1f3dba3c-7f04-4ab6-b927-caf171c91d89'), -- GraphQL

    -- City of Chandler
    (v_user_id, '5dfc2e1d-4b73-44e6-bff7-90b9fce48d5c', 'f5826bbe-3fd3-4f91-8e97-82d5bb953114'), -- Angular
    (v_user_id, 'cd93ba52-973f-4ff6-8067-664c9358e25e', 'e13242a8-83bf-423a-99df-f80fe3c58cac'), -- Microsoft SQL Server
    (v_user_id, 'cd93ba52-973f-4ff6-8067-664c9358e25e', '6620d72d-bb8d-4ac8-8570-122ac5dd81c5'), -- Microsoft Server Management Studio
    (v_user_id, '015de0d5-7a9c-4998-aa9a-bbf40175b308', 'f597166e-7fd2-4bb8-b9b5-3a61de485f7c'), -- Node.js
    (v_user_id, '015de0d5-7a9c-4998-aa9a-bbf40175b308', '3890470f-b5e3-462e-9f38-1a466b7ab6e7'), -- TypeScript
    (v_user_id, '33c2ac3e-8792-4674-bb2a-e290d266eb58', 'e13242a8-83bf-423a-99df-f80fe3c58cac'), -- Microsoft SQL Server
    (v_user_id, '33c2ac3e-8792-4674-bb2a-e290d266eb58', 'dd190ea2-9783-4c79-9113-604f8266fa16'), -- SQL

    -- Virga Labs
    (v_user_id, 'ab0b4a0d-8373-4a86-9dcf-77f6a1ddae30', '389eae65-987b-4091-b52b-649520577e60'), -- Next.js
    (v_user_id, 'cc7bead3-b239-4bc3-b065-d39f9214cf95', 'd737de6b-0183-49d9-b86c-27fa834e6394'), -- Vercel
    (v_user_id, '3f7be971-1e74-4607-8299-7f7a7d7bedc6', '61af63eb-adfc-4a26-95c6-5aac4c60f02f'), -- Python
    (v_user_id, '3f7be971-1e74-4607-8299-7f7a7d7bedc6', 'adfa0164-0015-4ef1-a4ec-16dd22063bcb'), -- Flask
    (v_user_id, '3f7be971-1e74-4607-8299-7f7a7d7bedc6', 'e17e134c-fe63-494b-8ecf-99feb7c89bf9'), -- REST APIs
    (v_user_id, 'b6421eea-a6f8-46e0-bf49-40e921ed0517', '62646dc5-b0d7-4c80-bb91-30850ded9a6c'), -- Supabase
    (v_user_id, 'b6421eea-a6f8-46e0-bf49-40e921ed0517', '4d3ee19d-dbe7-4258-b7e5-c92ae28ee11f'), -- PostgreSQL

    -- Codesmith
    (v_user_id, '062e0392-7c73-4f76-a6f8-bc9610700e96', 'e2a89627-0bcd-46fd-b10c-b2f9becac6fb'), -- React
    (v_user_id, '062e0392-7c73-4f76-a6f8-bc9610700e96', 'c64454e1-c3ab-47da-a1a0-69037084addd'), -- Redux
    (v_user_id, '062e0392-7c73-4f76-a6f8-bc9610700e96', 'f597166e-7fd2-4bb8-b9b5-3a61de485f7c'), -- Node.js
    (v_user_id, '062e0392-7c73-4f76-a6f8-bc9610700e96', '5c035fd3-88f7-47a8-b241-cbaf44103a13'), -- Express.js
    (v_user_id, 'f5539daa-1d86-407f-bc80-2ab57cb98e3c', 'e2a89627-0bcd-46fd-b10c-b2f9becac6fb'), -- React
    (v_user_id, '46631b60-034f-4a22-bbd8-31d4446d0c1c', 'c8d2d725-9dd6-46b5-ba65-b8874438c1be'), -- Enzyme
    (v_user_id, '46631b60-034f-4a22-bbd8-31d4446d0c1c', 'bcbbcc7e-5df5-464e-8627-447245f38d3c'), -- Jest
    (v_user_id, '46631b60-034f-4a22-bbd8-31d4446d0c1c', 'e2a89627-0bcd-46fd-b10c-b2f9becac6fb'), -- React
    (v_user_id, '46631b60-034f-4a22-bbd8-31d4446d0c1c', 'c64454e1-c3ab-47da-a1a0-69037084addd'), -- Redux
    (v_user_id, '46631b60-034f-4a22-bbd8-31d4446d0c1c', '5c035fd3-88f7-47a8-b241-cbaf44103a13'), -- Express.js

    -- Herbert Walker LLC.
    (v_user_id, '89a832ad-f77e-4eda-a717-1647d4d22142', '9e18d344-646c-4d51-88cf-a069e6228a0a'), -- CSS3
    (v_user_id, '89a832ad-f77e-4eda-a717-1647d4d22142', '02d0b5e3-866c-47da-8873-a9827da6411b'), -- HTML5
    (v_user_id, '89a832ad-f77e-4eda-a717-1647d4d22142', '6d8218d8-766d-4c1c-bc96-a8bd35d21e1d'), -- JavaScript
    (v_user_id, '89a832ad-f77e-4eda-a717-1647d4d22142', 'e2a89627-0bcd-46fd-b10c-b2f9becac6fb'), -- React
    (v_user_id, '89a832ad-f77e-4eda-a717-1647d4d22142', '1ac27b56-0a42-4bae-8739-ececb04ad8a4'); -- UI/UX Best Practices

  -- ===================== EDUCATION =====================
  insert into education (user_id, institution, credential, completed, notes) values
    (v_user_id, 'Arizona State University', 'BA', true, 'Field of study not specified on resume -- add if you want it recorded.');

end $$;
