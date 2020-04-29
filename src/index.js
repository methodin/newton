let newtonInstance = null;

function NewtonManager() {
  this.reset = () => {
    this.whens = [], this.befores = [], this.emissions = {};
  }
  this.reset();

  this.emit = (originalData) => {
    let data = originalData;
    let name = data.constructor.name;
    
    if (data.constructor.name === 'Object') {
      name = Object.keys(data)[0];
      data = originalData[name];
    }
    
    this.emissions[name] = data;
    if (!this.whens[name]) return;

    const handle = (arr, name) => {
      if (!arr[name]) return false;

      let handled = false;
      arr[name].forEach((handler) => {
        const [type, func, conditions] = handler;
        if (typeof type === 'object' && !data instanceof type) return;
        if (!conditions || conditions(data)) {
          handled = true;
          func(data, name);
        }
      });
      return handled;
    };

    handle(this.befores, name);
    if (!handle(this.whens, name)) throw new UnhandledError(data);
  }
  
  this.handle = (type, arr, ...args) => {
    let types = type;
    if (!Array.isArray(types)) types = [type];

    types.forEach((type) => {
      const name = typeof type === 'function' ? type.name : type;
      if (!arr[name]) {
        arr[name] = [];
      }
      let func = args[0], conditions = null;
      if (args.length > 1) {
        func = args[1];
        conditions = args[0];
      }
      arr[name].push([type, func, conditions]);
      
      if (this.emissions[name]) {
        func(this.emissions[name], name);
      }
    });
  }

  this.when = (type, ...args) => {
    this.handle(type, this.whens, ...args);
  }

  this.before = (type, ...args) => {
    this.handle(type, this.befores, ...args);
  }

  this.monitor = (data) => {
    Object.keys(data).forEach((k) => {
      if (typeof data[k] === 'object') {
        data[k] = new Proxy(data[k], {
          set: (obj, prop, value) => {
            obj[prop] = value;
            this.emit({[k]: data[k]})
            return true;
          }
        });
      }
      this.emit({[k]: data[k]});
      this.when(k, (h) => data[k] = h);
    });
    return new Proxy(data, {
      set: (obj, prop, value) => {
        obj[prop] = value;
        this.emit({[prop]: value});
        return true;
      }
    });
  }
}

const Newton = (newInstance) => {
  if (typeof newInstance !== 'undefined') {
    return new NewtonManager(); 
  } else {
    if (!newtonInstance) {
      newtonInstance = new NewtonManager();
    }
    return newtonInstance;
  }
}

const NewtonApp = (id) => {
  const VALUE_REGEX = /[\{]{2}(\??)([^\}]+)[\}]{2}/g;
  const VALUE_TYPES = ['INPUT','TEXTAREA','SELECT'];
  const { emit, when } = Newton();
  
  class ConditionalWrapper {
    constructor(type, content) {
      this.node = document.createElement('when');
      when(type, (v) => {
        while (this.node.firstChild) {
          this.node.removeChild(this.node.lastChild);
        }
        if (!v) return;
        const frag = document.createRange().createContextualFragment(content);
        this.node.appendChild(frag);
        traverse(this.node);
      });
    }
    
    render() {
      traverse(this.node);
      return this.node;
    }
  }
  
  class WhenText extends HTMLElement {
    constructor(type) {
      // Always call super first in constructor
      super();
      const shadow = this.attachShadow({mode: 'open'});
      when(type, (v) => {
        //TODO optimize for text
        while (shadow.firstChild) {
          shadow.removeChild(shadow.lastChild);
        }
        if (v instanceof HTMLElement) {
          shadow.appendChild(v);
          traverse(shadow);
        } else {
          if (typeof v === 'object' && v.constructor.name === 'Object') v = JSON.stringify(v);
          const textNode = document.createTextNode(v);
          shadow.appendChild(textNode);
        }
        
        if (typeof v.rendered == 'function') v.rendered(this.node);
      });
    }
  }
  customElements.define('when-text', WhenText);
  
  class WhenValue {
    constructor(type, node) {
      when(type, (v) => node.value = v);
      const handler = () => emit({[type]: node.value});
      node.onkeyup = handler;
      node.onchange = handler;
    }
  }
  
  function traverse(node) {
    const addNode = (parent, newNode, before) => parent.insertBefore(newNode, before);
    const addTextNode = (parent, text, before) => addNode(parent, document.createTextNode(text), before);

    // Replace all text nodes with {{}} values with separate text nodes
    Array.from(node.childNodes).forEach((c) => {
      if (c.nodeType !== 3) return;
      const rawMatches = [...c.nodeValue.matchAll(VALUE_REGEX)];
      if (rawMatches.length === 0) return;
      const matches = rawMatches.reduce((c, m) => ({...c, ...{[m[0]]: m[2]}}), {});
      let workingData = c.nodeValue;
      Object.keys(matches).forEach((k) => {
        const split = workingData.split(k);
        const begin = split.shift();
        if (begin) addTextNode(node, begin, c);
        addNode(node, new WhenText(matches[k]), c);
        workingData = split.join(k);
      });
      if (workingData) addTextNode(node, workingData, c);
      node.removeChild(c);
    });
    
    Array.from(node.childNodes).forEach((c) => {
      if (c.nodeType !== 1) return;
      for (let i=0; i<c.attributes.length; i++) {
        const m = [...c.attributes[i].name.matchAll(VALUE_REGEX)];
        if (m.length === 0) continue;
        const [raw, conditional, type] = m[0];
        if (VALUE_TYPES.indexOf(c.nodeName) !== -1) {
          new WhenValue(type, c);
        } else {
          if (conditional) {
            c.removeAttribute(raw);
            node.replaceChild(new ConditionalWrapper(type, c.outerHTML).render(), c);
          } else {
            c.appendChild(new WhenText(type, conditional));
          }
        }
      }
      traverse(c);
      if (c.shadowRoot) traverse(c.shadowRoot);
    })
    if (node.shadowRoot) traverse(node.shadowRoot);
  }

  traverse(document.getElementById(id));
}

export {NewtonApp, Newton};
