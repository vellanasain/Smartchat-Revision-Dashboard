<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\Revision;
use App\Models\RevisionGroup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class RevisionController extends Controller
{
    private array $marketingNames = [
        'Ayu',
        'Iin',
        'Ikmah',
        'Aulia',
        'Zaqia',
        'Bella',
        'Reni',
        'Sevya',
        'Wiwin',
        'Tika',
        'Ingka',
        'Cindi',
        'ptasainovasi',
        'pteksadigital',
        'Dea',
        'Ika',
        'Sekar',
        'Okti',
        'Neneng',
        'Vika',
        'EbyB',
        'Ifah',
        'Yesi',
        'Andini',
        'Yovanti',
        'Imelia',
        'Zalfa',
    ];

    public function index(Request $request)
    {
        $search = trim((string) $request->query('q', ''));
        $filter = $request->query('filter', 'all');
        $marketingFilter = $request->query('marketing_id');
        $webFilter = $request->query('web_id');
        $selectedMarketingId = filled($marketingFilter) && ctype_digit((string) $marketingFilter) ? (int) $marketingFilter : null;
        $selectedWebId = filled($webFilter) && ctype_digit((string) $webFilter) ? (int) $webFilter : null;

        $query = RevisionGroup::query()
            ->with([
                'conversation:id,name,user_id,tim_design_id,company_id,notes,end_session',
                'conversation.marketing:id,name,role',
                'conversation.timWebsite:id,name,role',
                'conversation.userInfo:id,conversation_id,is_50_paid,is_paid,is_rev_0_done,is_rev_1_done,is_rev_2_done,is_rev_3_done',
                'revisions:id,revision_group_id,conversation_id,deskripsi,jenis,status,is_answered,is_collecting,response_date,created_at',
            ])
            ->withCount('revisions')
            ->latest('updated_at');

        if ($search !== '') {
            collect(preg_split('/\s+/', mb_strtolower($search), -1, PREG_SPLIT_NO_EMPTY))
                ->unique()
                ->each(fn ($term) => $this->applySearchTerm($query, $term));
        }

        if ($selectedMarketingId) {
            $query->whereHas('conversation', fn ($conversation) => $conversation->where('user_id', $selectedMarketingId));
        }

        if ($selectedWebId && Schema::hasColumn('conversations', 'tim_design_id')) {
            $query->whereHas('conversation', fn ($conversation) => $conversation->where('tim_design_id', $selectedWebId));
        }

        if ($filter === 'process_revision') {
            $query->whereHas('revisions', fn ($revision) => $revision->where('jenis', '>', 0)->where('is_answered', 0));
        } elseif ($filter === 'unpaid') {
            $query->whereHas('conversation.userInfo', fn ($info) => $info
                ->where(fn ($builder) => $builder->where('is_50_paid', 0)->orWhereNull('is_50_paid'))
                ->where(fn ($builder) => $builder->where('is_paid', 0)->orWhereNull('is_paid')));
        } elseif ($filter === 'revision_done') {
            $query->whereHas('conversation.userInfo', fn ($info) => $info->where(function ($builder) {
                $builder->where('is_rev_1_done', 1)
                    ->orWhere('is_rev_2_done', 1)
                    ->orWhere('is_rev_3_done', 1);
            }));
        }

        $groups = $query->paginate(12)->withQueryString();

        $stats = [
            'total' => RevisionGroup::count(),
            'unpaid' => RevisionGroup::whereHas('conversation.userInfo', fn ($info) => $info
                ->where(fn ($builder) => $builder->where('is_50_paid', 0)->orWhereNull('is_50_paid'))
                ->where(fn ($builder) => $builder->where('is_paid', 0)->orWhereNull('is_paid')))->count(),
            'process_revision' => Revision::where('jenis', '>', 0)->where('is_answered', 0)->distinct('revision_group_id')->count('revision_group_id'),
            'revision_done' => RevisionGroup::whereHas('conversation.userInfo', fn ($info) => $info->where(function ($builder) {
                $builder->where('is_rev_1_done', 1)
                    ->orWhere('is_rev_2_done', 1)
                    ->orWhere('is_rev_3_done', 1);
            }))->count(),
        ];
        $teamUsers = User::where('role', 'website')->orderBy('name')->get(['id', 'name']);
        $marketingUsers = User::query()
            ->whereIn(DB::raw('LOWER(name)'), array_map('strtolower', $this->marketingNames))
            ->get(['id', 'name'])
            ->sortBy(fn ($user) => array_search(strtolower($user->name), array_map('strtolower', $this->marketingNames)))
            ->values();

        return view('revisions.index', compact(
            'groups',
            'stats',
            'search',
            'filter',
            'teamUsers',
            'marketingUsers',
            'selectedMarketingId',
            'selectedWebId'
        ));
    }

    private function applySearchTerm($query, string $term): void
    {
        $like = '%'.$this->escapeLike($term).'%';

        $query->where(function ($builder) use ($like) {
            $builder->whereRaw('LOWER(revision_groups.domain) LIKE ? ESCAPE "\\\\"', [$like])
                ->orWhereHas('conversation', function ($conversation) use ($like) {
                    $conversation->whereRaw('LOWER(name) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(notes) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereHas('marketing', function ($user) use ($like) {
                            $user->whereRaw('LOWER(name) LIKE ? ESCAPE "\\\\"', [$like]);
                        })
                        ->orWhereHas('timWebsite', function ($user) use ($like) {
                            $user->whereRaw('LOWER(name) LIKE ? ESCAPE "\\\\"', [$like]);
                        });
                })
                ->orWhereHas('revisions', function ($revision) use ($like) {
                    $revision->whereRaw('LOWER(deskripsi) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(notes) LIKE ? ESCAPE "\\\\"', [$like])
                        ->orWhereRaw('LOWER(response) LIKE ? ESCAPE "\\\\"', [$like]);
                });
        });
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    public function create()
    {
        $teamUsers = User::where('role', 'website')->orderBy('name')->get(['id', 'name']);
        $marketingUsers = User::query()
            ->whereIn(DB::raw('LOWER(name)'), array_map('strtolower', $this->marketingNames))
            ->get(['id', 'name'])
            ->sortBy(fn ($user) => array_search(strtolower($user->name), array_map('strtolower', $this->marketingNames)))
            ->values();
        $clients = Conversation::query()
            ->whereNotNull('name')
            ->where('name', '<>', '')
            ->whereIn('user_id', $marketingUsers->pluck('id'))
            ->select('user_id', 'name')
            ->distinct()
            ->orderBy('name')
            ->get();

        return view('revisions.create', compact('teamUsers', 'marketingUsers', 'clients'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'domain' => 'required|string|max:100',
            'nama' => 'nullable|string|max:100',
            'user_id' => 'required|integer|exists:users,id',
            'tim_design_id' => 'nullable|integer|exists:users,id',
            'sisa_pelunasan' => 'nullable|integer|min:0',
        ]);

        DB::transaction(function () use ($data) {
            $conversation = Conversation::create([
                'name' => $data['nama'] ?? null,
                'user_id' => $data['user_id'],
                'tim_design_id' => $data['tim_design_id'] ?? null,
                'company_id' => 1,
            ]);

            $group = RevisionGroup::create([
                'conversation_id' => $conversation->id,
                'domain' => $data['domain'],
                'active_revision' => 0,
                'status' => 1,
            ]);

            Revision::create([
                'conversation_id' => $conversation->id,
                'revision_group_id' => $group->id,
                'deskripsi' => 'Menunggu Website Jadi',
                'jenis' => 0,
                'status' => 0,
                'is_answered' => 2,
            ]);
        });

        return redirect()->route('revisions.index')->with('success', 'Revisi baru berhasil ditambahkan.');
    }

    public function updateTeam(Request $request, RevisionGroup $group)
    {
        $data = $request->validate([
            'tim_design_id' => 'nullable|integer|exists:users,id',
        ]);

        if (Schema::hasColumn('conversations', 'tim_design_id')) {
            $group->conversation?->update([
                'tim_design_id' => $data['tim_design_id'] ?? null,
            ]);
        }

        return redirect()->route('revisions.index', $request->only(['q', 'filter', 'marketing_id', 'web_id']))->with('success', 'Tim web berhasil diperbarui.');
    }

    public function destroyGroup(RevisionGroup $group)
    {
        DB::transaction(function () use ($group) {
            $revisionIds = $group->revisions()->pluck('id');
            DB::table('chat_revisions')->whereIn('revision_id', $revisionIds)->delete();
            Revision::whereIn('id', $revisionIds)->delete();
            $group->delete();
        });

        return redirect()->route('revisions.index')->with('success', 'Data revisi berhasil dihapus.');
    }



    public function detailBootstrap($id)
    {
        $revision = Revision::with([
            'conversation:id,name,user_id,tim_design_id,company_id,notes,end_session,tanggal_pelunasan,sisa_pelunasan,is_automate_pelunasan',
            'conversation.marketing:id,name,role',
            'conversation.timWebsite:id,name,role',
            'conversation.userInfo:id,conversation_id,is_50_paid,is_paid,is_rev_0_done,is_rev_1_done,is_rev_2_done,is_rev_3_done,package,monthly_bill,domain',
            'group:id,domain,active_revision,status,conversation_id',
            'group.revisions:id,revision_group_id,conversation_id,jenis,response,notes,is_answered,is_collecting',
        ])->findOrFail($id);

        $group = $revision->group;
        $conversation = $revision->conversation;
        $domain = optional($group)->domain ?: optional($conversation)->domain ?: '-';
        $money = fn ($value) => filled($value) ? 'Rp ' . number_format((int) $value, 0, ',', '.') : '-';
        $info = optional($conversation)->userInfo;

        $stageLabels = [
            ['value' => '', 'label' => '--'],
            ['value' => 'waiting_client_data', 'label' => 'Waiting Client Data'],
            ['value' => 'ready_to_revision', 'label' => 'Ready to Revision'],
        ];
        $workLabels = [
            ['value' => '', 'label' => '--'],
            ['value' => 'not_started', 'label' => 'Not Started'],
            ['value' => 'on_process', 'label' => 'On Progress'],
            ['value' => 'done', 'label' => 'Done'],
        ];

        $rows = collect(range(0,3))->map(function ($jenis) use ($group) {
            $row = optional($group)->revisions?->firstWhere('jenis', $jenis);
            $stage = $jenis === 0 ? '' : (filled(optional($row)->response) ? $row->response : '');
            $work = '';
            if ($row) {
                if ((int) $row->is_answered === 1) $work = 'done';
                elseif ((int) $row->is_collecting === 1) $work = 'on_process';
            }
            return [
                'jenis' => $jenis,
                'label' => $jenis === 0 ? 'Website sudah jadi' : 'Revisi '.$jenis,
                'stage' => $stage,
                'work' => $work,
                'note' => (string) optional($row)->notes,
            ];
        })->values();

        $payment = ((int) optional($info)->is_paid === 1) ? 'Lunas' : (((int) optional($info)->is_50_paid === 1) ? '50% Lunas' : 'Belum Lunas');

        return response()->json([
            'csrf_token' => csrf_token(),
            'revision_id' => (int) $revision->id,
            'domain' => $domain,
            'project_info' => [
                'domain_sementara' => $domain,
                'nama_klien' => optional($conversation)->name ?: '-',
                'tim_marketing' => optional(optional($conversation)->marketing)->name ?: '-',
                'tim_web' => optional(optional($conversation)->timWebsite)->name ?: '--',
                'sisa_pelunasan' => $money(optional($conversation)->sisa_pelunasan),
                'status_pembayaran' => $payment,
                'tanggal_pelunasan' => optional(optional($conversation)->tanggal_pelunasan)?->format('d/m/Y') ?: '-',
            ],
            'project_notes' => [
                'package_website' => (string) (optional($info)->package ?: ''),
                'biaya' => (string) (optional($info)->monthly_bill ?: ''),
                'domain_resmi' => (string) (optional($info)->domain ?: ''),
            ],
            'rows' => $rows,
            'options' => [
                'stages' => $stageLabels,
                'work' => $workLabels,
                'work_r0' => [
                    ['value' => '', 'label' => '--'],
                    ['value' => 'done', 'label' => 'Done'],
                ],
            ],
        ]);
    }

    public function edit($id)
    {
        $revision = Revision::with([
            'conversation:id,name,user_id,tim_design_id,company_id,notes,end_session',
            'conversation.marketing:id,name,role',
            'conversation.timWebsite:id,name,role',
            'conversation.userInfo:id,conversation_id,is_50_paid,is_paid,is_rev_0_done,is_rev_1_done,is_rev_2_done,is_rev_3_done,package,monthly_bill,domain',
            'group:id,domain,active_revision,status,conversation_id',
            'group.revisions:id,revision_group_id,conversation_id,deskripsi,jenis,status,is_answered,is_collecting,response,notes,created_at',
            'chats' => fn ($query) => $query->oldest('created_at'),
        ])->findOrFail($id);

        return view('revisions.edit', compact('revision'));
    }

    public function update(Request $request, $id)
    {
        $revision = Revision::with(['group.revisions', 'conversation'])->findOrFail($id);

        $data = $request->validate([
            'stages' => 'array',
            'stages.*' => 'nullable|in:,waiting_client_data,ready_to_revision',
            'work_statuses' => 'array',
            'work_statuses.*' => 'nullable|in:,not_started,on_process,done',
            'revision_notes' => 'array',
            'revision_notes.*' => 'nullable|string',
            'project_notes.package_website' => 'nullable|string|max:255',
            'project_notes.biaya' => 'nullable|string|max:255',
            'project_notes.domain_resmi' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($revision, $data) {
            $group = $revision->group;
            $conversation = $revision->conversation;

            for ($jenis = 0; $jenis <= 3; $jenis++) {
                $row = $group->revisions->firstWhere('jenis', $jenis);
                $workStatus = $data['work_statuses'][$jenis] ?: 'not_started';

                $payload = [
                    'conversation_id' => $conversation->id,
                    'revision_group_id' => $group->id,
                    'jenis' => $jenis,
                    'deskripsi' => $jenis === 0 ? 'Website Sudah Jadi' : 'Revisi Tahap '.$jenis,
                    'response' => $data['stages'][$jenis] ?? null,
                    'notes' => $data['revision_notes'][$jenis] ?? null,
                    'status' => 1,
                    'is_collecting' => $workStatus === 'on_process' ? 1 : 0,
                    'is_answered' => $workStatus === 'done' ? 1 : 0,
                ];

                if ($row) {
                    $row->update($payload);
                } else {
                    Revision::create($payload);
                }
            }

            $projectNotes = $data['project_notes'] ?? [];
            $notesText = collect([
                'Paket Website' => $projectNotes['package_website'] ?? null,
                'Biaya' => $projectNotes['biaya'] ?? null,
                'Domain Resmi' => $projectNotes['domain_resmi'] ?? null,
            ])
                ->filter(fn ($value) => filled($value))
                ->map(fn ($value, $key) => $key.': '.$value)
                ->implode(PHP_EOL);

            $conversation->update([
                'notes' => $notesText ?: null,
            ]);
        });

        return redirect()->route('revisions.edit', $revision->id)->with('success', 'Detail revisi berhasil diperbarui.');
    }
}
