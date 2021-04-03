
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
function noop() {}

function assign(tar, src) {
	// @ts-ignore
	for (const k in src) tar[k] = src[k];
	return tar ;
}

function add_location(element, file, line, column, char) {
	element.__svelte_meta = {
		loc: { file, line, column, char }
	};
}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

function run_all(fns) {
	fns.forEach(run);
}

function is_function(thing) {
	return typeof thing === 'function';
}

function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}

function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

function exclude_internal_props(props) {
	const result = {};
	for (const k in props) if (k[0] !== '$') result[k] = props[k];
	return result;
}

function compute_rest_props(props, keys) {
	const rest = {};
	keys = new Set(keys);
	for (const k in props) if (!keys.has(k) && k[0] !== '$') rest[k] = props[k];
	return rest;
}

function append(target, node) {
	target.appendChild(node);
}

function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

function detach(node) {
	node.parentNode.removeChild(node);
}

function element(name) {
	return document.createElement(name);
}

function text(data) {
	return document.createTextNode(data);
}

function children(element) {
	return Array.from(element.childNodes);
}

function custom_event(type, detail) {
	const e = document.createEvent('CustomEvent');
	e.initCustomEvent(type, false, false, detail);
	return e;
}

let current_component;

function set_current_component(component) {
	current_component = component;
}

function get_current_component() {
	if (!current_component) throw new Error('Function called outside component initialization');
	return current_component;
}

function onMount(fn) {
	get_current_component().$$.on_mount.push(fn);
}

function onDestroy(fn) {
	get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];

const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];

const resolved_promise = Promise.resolve();
let update_scheduled = false;

function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

function add_render_callback(fn) {
	render_callbacks.push(fn);
}

function add_flush_callback(fn) {
	flush_callbacks.push(fn);
}

let flushing = false;
const seen_callbacks = new Set();
function flush() {
	if (flushing) return;
	flushing = true;

	do {
		// first, call beforeUpdate functions
		// and update components
		for (let i = 0; i < dirty_components.length; i += 1) {
			const component = dirty_components[i];
			set_current_component(component);
			update(component.$$);
		}
		set_current_component(null);

		dirty_components.length = 0;

		while (binding_callbacks.length) binding_callbacks.pop()();

		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];

			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);

				callback();
			}
		}

		render_callbacks.length = 0;
	} while (dirty_components.length);

	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}

	update_scheduled = false;
	flushing = false;
	seen_callbacks.clear();
}

function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);

		$$.after_update.forEach(add_render_callback);
	}
}

const outroing = new Set();
let outros;

function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

function transition_out(block, local, detach, callback) {
	if (block && block.o) {
		if (outroing.has(block)) return;
		outroing.add(block);

		outros.c.push(() => {
			outroing.delete(block);
			if (callback) {
				if (detach) block.d(1);
				callback();
			}
		});

		block.o(local);
	}
}

function get_spread_update(levels, updates) {
	const update = {};

	const to_null_out = {};
	const accounted_for = { $$scope: 1 };

	let i = levels.length;
	while (i--) {
		const o = levels[i];
		const n = updates[i];

		if (n) {
			for (const key in o) {
				if (!(key in n)) to_null_out[key] = 1;
			}

			for (const key in n) {
				if (!accounted_for[key]) {
					update[key] = n[key];
					accounted_for[key] = 1;
				}
			}

			levels[i] = n;
		} else {
			for (const key in o) {
				accounted_for[key] = 1;
			}
		}
	}

	for (const key in to_null_out) {
		if (!(key in update)) update[key] = undefined;
	}

	return update;
}

function get_spread_object(spread_props) {
	return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}

function bind(component, name, callback) {
	const index = component.$$.props[name];
	if (index !== undefined) {
		component.$$.bound[index] = callback;
		callback(component.$$.ctx[index]);
	}
}

function create_component(block) {
	block && block.c();
}

function mount_component(component, target, anchor, customElement) {
	const { fragment, on_mount, on_destroy, after_update } = component.$$;

	fragment && fragment.m(target, anchor);

	if (!customElement) {
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {

			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
	}

	after_update.forEach(add_render_callback);
}

function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		run_all($$.on_destroy);

		$$.fragment && $$.fragment.d(detaching);

		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}

function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
	const parent_component = current_component;
	set_current_component(component);

	const $$ = component.$$ = {
		fragment: null,
		ctx: null,

		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),

		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(parent_component ? parent_component.$$.context : options.context || []),

		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false
	};

	let ready = false;

	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
			const value = rest.length ? rest[0] : ret;
			if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
				if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
				if (ready) make_dirty(component, i);
			}
			return ret;
		})
		: [];

	$$.update();
	ready = true;
	run_all($$.before_update);

	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;

	if (options.target) {
		if (options.hydrate) {
			const nodes = children(options.target);
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}

		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor, options.customElement);
		flush();
	}

	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
	
	

	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	$on(type, callback) {
		const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
		callbacks.push(callback);

		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	$set($$props) {
		if (this.$$set && !is_empty($$props)) {
			this.$$.skip_bound = true;
			this.$$set($$props);
			this.$$.skip_bound = false;
		}
	}
}

function dispatch_dev(type, detail) {
	document.dispatchEvent(custom_event(type, { version: '3.37.0', ...detail }));
}

function append_dev(target, node) {
	dispatch_dev('SvelteDOMInsert', { target, node });
	append(target, node);
}

function insert_dev(target, node, anchor) {
	dispatch_dev('SvelteDOMInsert', { target, node, anchor });
	insert(target, node, anchor);
}

function detach_dev(node) {
	dispatch_dev('SvelteDOMRemove', { node });
	detach(node);
}

function set_data_dev(text, data) {
	data = '' + data;
	if (text.wholeText === data) return;

	dispatch_dev('SvelteDOMSetData', { node: text, data });
	text.data = data;
}

function validate_slots(name, slot, keys) {
	for (const slot_key of Object.keys(slot)) {
		if (!~keys.indexOf(slot_key)) {
			console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
		}
	}
}








/**
 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
 */
class SvelteComponentDev extends SvelteComponent {
	/**
	 * @private
	 * For type checking capabilities only.
	 * Does not exist at runtime.
	 * ### DO NOT USE!
	 */
	
	/**
	 * @private
	 * For type checking capabilities only.
	 * Does not exist at runtime.
	 * ### DO NOT USE!
	 */
	
	/**
	 * @private
	 * For type checking capabilities only.
	 * Does not exist at runtime.
	 * ### DO NOT USE!
	 */
	

	constructor(options






) {
		if (!options || (!options.target && !options.$$inline)) {
			throw new Error("'target' is a required option");
		}

		super();
	}

	$destroy() {
		super.$destroy();
		this.$destroy = () => {
			console.warn('Component was already destroyed'); // eslint-disable-line no-console
		};
	}

	$capture_state() {}

	$inject_state() {}
}

/* src\C.svelte generated by Svelte v3.37.0 */
const file = "src\\C.svelte";

function create_fragment$2(ctx) {
	let p;
	let t0;
	let t1;
	let t2;
	let t3;
	let t4;
	let t5;

	const block = {
		c: function create() {
			p = element("p");
			t0 = text("foo: ");
			t1 = text(/*foo*/ ctx[0]);
			t2 = text("; bar: ");
			t3 = text(/*bar*/ ctx[1]);
			t4 = text("; baz: ");
			t5 = text(/*baz*/ ctx[2]);
			add_location(p, file, 23, 0, 328);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
			append_dev(p, t0);
			append_dev(p, t1);
			append_dev(p, t2);
			append_dev(p, t3);
			append_dev(p, t4);
			append_dev(p, t5);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*foo*/ 1) set_data_dev(t1, /*foo*/ ctx[0]);
			if (dirty & /*bar*/ 2) set_data_dev(t3, /*bar*/ ctx[1]);
			if (dirty & /*baz*/ 4) set_data_dev(t5, /*baz*/ ctx[2]);
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) detach_dev(p);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("C", slots, []);
	let interval;
	let { foo } = $$props;
	let { bar } = $$props;
	let { baz } = $$props;

	onMount(() => {
		interval = setInterval(
			() => {
				$$invalidate(0, foo++, foo);
				$$invalidate(1, bar++, bar);
				$$invalidate(2, baz++, baz);
			},
			1000
		);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	const writable_props = ["foo", "bar", "baz"];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<C> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ("foo" in $$props) $$invalidate(0, foo = $$props.foo);
		if ("bar" in $$props) $$invalidate(1, bar = $$props.bar);
		if ("baz" in $$props) $$invalidate(2, baz = $$props.baz);
	};

	$$self.$capture_state = () => ({
		onMount,
		onDestroy,
		interval,
		foo,
		bar,
		baz
	});

	$$self.$inject_state = $$props => {
		if ("interval" in $$props) interval = $$props.interval;
		if ("foo" in $$props) $$invalidate(0, foo = $$props.foo);
		if ("bar" in $$props) $$invalidate(1, bar = $$props.bar);
		if ("baz" in $$props) $$invalidate(2, baz = $$props.baz);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [foo, bar, baz];
}

class C extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { foo: 0, bar: 1, baz: 2 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "C",
			options,
			id: create_fragment$2.name
		});

		const { ctx } = this.$$;
		const props = options.props || {};

		if (/*foo*/ ctx[0] === undefined && !("foo" in props)) {
			console.warn("<C> was created without expected prop 'foo'");
		}

		if (/*bar*/ ctx[1] === undefined && !("bar" in props)) {
			console.warn("<C> was created without expected prop 'bar'");
		}

		if (/*baz*/ ctx[2] === undefined && !("baz" in props)) {
			console.warn("<C> was created without expected prop 'baz'");
		}
	}

	get foo() {
		return this.$$.ctx[0];
	}

	set foo(foo) {
		this.$set({ foo });
		flush();
	}

	get bar() {
		return this.$$.ctx[1];
	}

	set bar(bar) {
		this.$set({ bar });
		flush();
	}

	get baz() {
		return this.$$.ctx[2];
	}

	set baz(baz) {
		this.$set({ baz });
		flush();
	}
}

/* src\B.svelte generated by Svelte v3.37.0 */

function create_fragment$1(ctx) {
	let c;
	let updating_baz;
	let updating_restProps;
	let current;
	const c_spread_levels = [/*restProps*/ ctx[0]];

	function c_baz_binding(value) {
		/*c_baz_binding*/ ctx[2](value);
	}

	function c_restProps_binding(key, value) {
		/*c_restProps_binding*/ ctx[3](key, value);
	}

	let c_props = {};

	for (let i = 0; i < c_spread_levels.length; i += 1) {
		c_props = assign(c_props, c_spread_levels[i]);
	}

	if (/*baz*/ ctx[1] !== void 0) {
		c_props.baz = /*baz*/ ctx[1];
	}

	c = new C({ props: c_props, $$inline: true });
	binding_callbacks.push(() => bind(c, "baz", c_baz_binding));
	binding_callbacks.push(() => Object.keys(ctx[2]).forEach(key => bind(c, key, c_restProps_binding.bind(undefined, key))));

	const block = {
		c: function create() {
			create_component(c.$$.fragment);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(c, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const c_changes = (dirty & /*baz, restProps*/ 3)
			? get_spread_update(c_spread_levels, [dirty & /*restProps*/ 1 && get_spread_object(/*restProps*/ ctx[0])])
			: {};

			if (!updating_baz && dirty & /*baz*/ 2) {
				updating_baz = true;
				c_changes.baz = /*baz*/ ctx[1];
				add_flush_callback(() => updating_baz = false);
			}

			if (!updating_restProps && dirty & /*restProps*/ 1) {
				updating_restProps = true;
				add_flush_callback(() => updating_restProps = false);
			}

			c.$set(c_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(c.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(c.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(c, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	let restProps;
	const omit_props_names = [];
	let $$restProps = compute_rest_props($$props, omit_props_names);
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("B", slots, []);
	let baz = 3; // baz was abstracted out from A.svelte

	function updateRestProps(restProps) {
		Object.entries(restProps).forEach(([key, value]) => {
			$$invalidate(5, $$restProps[key] = value, $$restProps);
		});
	}

	function c_baz_binding(value) {
		baz = value;
		$$invalidate(1, baz);
	}

	function c_restProps_binding(key, value) {
		restProps[key] = value;
		($$invalidate(0, restProps), $$invalidate(5, $$restProps));
	}

	$$self.$$set = $$new_props => {
		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
		$$invalidate(5, $$restProps = compute_rest_props($$props, omit_props_names));
	};

	$$self.$capture_state = () => ({ C, baz, updateRestProps, restProps });

	$$self.$inject_state = $$new_props => {
		if ("baz" in $$props) $$invalidate(1, baz = $$new_props.baz);
		if ("restProps" in $$props) $$invalidate(0, restProps = $$new_props.restProps);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		$$invalidate(0, restProps = $$restProps);

		if ($$self.$$.dirty & /*restProps*/ 1) {
			(updateRestProps(restProps));
		}
	};

	return [restProps, baz, c_baz_binding, c_restProps_binding];
}

class B extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "B",
			options,
			id: create_fragment$1.name
		});
	}
}

/* src\A.svelte generated by Svelte v3.37.0 */

function create_fragment(ctx) {
	let b;
	let updating_foo;
	let updating_bar;
	let current;

	function b_foo_binding(value) {
		/*b_foo_binding*/ ctx[2](value);
	}

	function b_bar_binding(value) {
		/*b_bar_binding*/ ctx[3](value);
	}

	let b_props = {};

	if (/*foo*/ ctx[0] !== void 0) {
		b_props.foo = /*foo*/ ctx[0];
	}

	if (/*bar*/ ctx[1] !== void 0) {
		b_props.bar = /*bar*/ ctx[1];
	}

	b = new B({ props: b_props, $$inline: true });
	binding_callbacks.push(() => bind(b, "foo", b_foo_binding));
	binding_callbacks.push(() => bind(b, "bar", b_bar_binding));

	const block = {
		c: function create() {
			create_component(b.$$.fragment);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			mount_component(b, target, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			const b_changes = {};

			if (!updating_foo && dirty & /*foo*/ 1) {
				updating_foo = true;
				b_changes.foo = /*foo*/ ctx[0];
				add_flush_callback(() => updating_foo = false);
			}

			if (!updating_bar && dirty & /*bar*/ 2) {
				updating_bar = true;
				b_changes.bar = /*bar*/ ctx[1];
				add_flush_callback(() => updating_bar = false);
			}

			b.$set(b_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(b.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(b.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(b, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots("A", slots, []);
	let interval;
	let foo = 1;
	let bar = 2;

	onMount(() => {
		interval = setInterval(
			() => {
				$$invalidate(0, foo *= 2);
				$$invalidate(1, bar *= 2);
			},
			1000
		);
	});

	onDestroy(() => {
		clearInterval(interval);
	});

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<A> was created with unknown prop '${key}'`);
	});

	function b_foo_binding(value) {
		foo = value;
		$$invalidate(0, foo);
	}

	function b_bar_binding(value) {
		bar = value;
		$$invalidate(1, bar);
	}

	$$self.$capture_state = () => ({
		onMount,
		onDestroy,
		B,
		interval,
		foo,
		bar
	});

	$$self.$inject_state = $$props => {
		if ("interval" in $$props) interval = $$props.interval;
		if ("foo" in $$props) $$invalidate(0, foo = $$props.foo);
		if ("bar" in $$props) $$invalidate(1, bar = $$props.bar);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [foo, bar, b_foo_binding, b_bar_binding];
}

class A extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "A",
			options,
			id: create_fragment.name
		});
	}
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment

const app = new A({
	target: document.body,
	props: {},
});

export default app;
//# sourceMappingURL=index.js.map
